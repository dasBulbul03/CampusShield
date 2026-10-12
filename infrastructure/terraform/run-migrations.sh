#!/usr/bin/env bash
set -euo pipefail

terraform_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cluster="$(terraform -chdir="$terraform_dir" output -raw ecs_cluster_name)"
service="$(terraform -chdir="$terraform_dir" output -raw backend_service_name)"
task_definition="$(aws ecs describe-services \
  --cluster "$cluster" \
  --services "$service" \
  --query 'services[0].taskDefinition' \
  --output text)"
subnets="$(terraform -chdir="$terraform_dir" output -json private_subnet_ids | jq -c '.')"
security_group="$(terraform -chdir="$terraform_dir" output -raw backend_security_group_id)"

network_configuration="$(jq -cn \
  --argjson subnets "$subnets" \
  --arg security_group "$security_group" \
  '{awsvpcConfiguration:{subnets:$subnets,securityGroups:[$security_group],assignPublicIp:"DISABLED"}}')"

response="$(aws ecs run-task \
  --cluster "$cluster" \
  --task-definition "$task_definition" \
  --launch-type FARGATE \
  --network-configuration "$network_configuration" \
  --overrides '{"containerOverrides":[{"name":"backend","command":["./migrate.sh"]}]}')"

task_arn="$(jq -r '.tasks[0].taskArn // empty' <<<"$response")"
if [[ -z "$task_arn" ]]; then
  jq -r '.failures[]? | "Migration task failed to start: \(.reason // .detail // "unknown reason")"' <<<"$response"
  exit 1
fi

echo "Waiting for migration task to stop: $task_arn"
aws ecs wait tasks-stopped --cluster "$cluster" --tasks "$task_arn"

task="$(aws ecs describe-tasks --cluster "$cluster" --tasks "$task_arn")"
exit_code="$(jq -r '.tasks[0].containers[] | select(.name == "backend") | .exitCode // empty' <<<"$task")"
if [[ "$exit_code" != "0" ]]; then
  jq '.tasks[0] | {stopCode, stoppedReason, containers}' <<<"$task"
  echo "Database migration failed with exit code ${exit_code:-unknown}." >&2
  exit 1
fi

echo "Database migrations and reference-data setup completed successfully."
