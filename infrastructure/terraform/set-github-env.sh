#!/usr/bin/env bash
# Create the GitHub environment (if needed) and populate the variables that
# .github/workflows/deploy.yml reads, straight from Terraform outputs.
#
# Run from infrastructure/terraform/ after a successful `terraform apply`.
# Requires: terraform, gh (authenticated with repo scope).
#
# Written for bash 3.2: macOS still ships 3.2, which has no associative
# arrays, so the pairs are listed rather than held in `declare -A`.
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-dasBulbul03/CampusShield}"
ENVIRONMENT="$(terraform output -raw github_environment_name)"
AWS_REGION="$(terraform output -raw aws_region)"
SUBNETS="$(terraform output -json private_subnet_ids \
  | python3 -c 'import json,sys; print(",".join(json.load(sys.stdin)))')"

if ! command -v gh >/dev/null; then
  echo "error: gh CLI not found" >&2
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo "error: gh is not authenticated. Run: gh auth login" >&2
  exit 1
fi
if [[ -z "$AWS_REGION" || -z "$ENVIRONMENT" ]]; then
  echo "error: Terraform outputs are empty. Run terraform apply first." >&2
  exit 1
fi

echo "==> Ensuring GitHub environment '${ENVIRONMENT}' exists on ${REPO}"
gh api -X PUT "repos/${REPO}/environments/${ENVIRONMENT}" >/dev/null

# name|value pairs. | rather than a tab, because values contain no pipes
# and tabs are easy to lose in editing.
PAIRS="
AWS_REGION|${AWS_REGION}
AWS_ROLE_ARN|$(terraform output -raw github_actions_role_arn)
BACKEND_ECR_REPOSITORY|$(terraform output -raw backend_ecr_repository_url)
FRONTEND_ECR_REPOSITORY|$(terraform output -raw frontend_ecr_repository_url)
ECS_CLUSTER|$(terraform output -raw ecs_cluster_name)
BACKEND_SERVICE|$(terraform output -raw backend_service_name)
FRONTEND_SERVICE|$(terraform output -raw frontend_service_name)
PRIVATE_SUBNET_IDS|${SUBNETS}
BACKEND_SECURITY_GROUP_ID|$(terraform output -raw backend_security_group_id)
APP_BASE_URL|$(terraform output -raw load_balancer_url)
"

count=0
echo "==> Setting variables on environment '${ENVIRONMENT}'"
while IFS='|' read -r name value; do
  [[ -z "$name" ]] && continue
  if [[ -z "$value" ]]; then
    echo "error: ${name} resolved to an empty value" >&2
    exit 1
  fi
  gh variable set "$name" --env "$ENVIRONMENT" --repo "$REPO" --body "$value"
  printf '    %-28s %s\n' "$name" "$value"
  count=$((count + 1))
done <<< "$PAIRS"

echo
echo "Done: ${count} variables set. Deploy from the Actions tab, or push to main."
