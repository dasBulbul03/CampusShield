output "aws_region" {
  description = "Region the stack is deployed in; used as the AWS_REGION GitHub environment variable."
  value       = var.aws_region
}

output "load_balancer_url" {
  description = "Public ALB URL. It redirects to HTTPS when an ACM certificate is configured."
  value       = "${var.acm_certificate_arn == "" ? "http" : "https"}://${aws_lb.main.dns_name}"
}

output "load_balancer_dns_name" {
  description = "ALB DNS name; point your DNS record here after deployment."
  value       = aws_lb.main.dns_name
}

output "backend_ecr_repository_url" {
  description = "ECR repository URL for the backend image."
  value       = aws_ecr_repository.backend.repository_url
}

output "frontend_ecr_repository_url" {
  description = "ECR repository URL for the frontend image."
  value       = aws_ecr_repository.frontend.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.main.name
}

output "backend_service_name" {
  description = "Backend ECS service name."
  value       = aws_ecs_service.backend.name
}

output "frontend_service_name" {
  description = "Frontend ECS service name."
  value       = aws_ecs_service.frontend.name
}

output "backend_task_definition_arn" {
  description = "Backend task definition ARN for migrations and deployments."
  value       = aws_ecs_task_definition.backend.arn
}

output "private_subnet_ids" {
  description = "Private subnet IDs used by ECS services and RDS."
  value       = aws_subnet.private[*].id
}

output "backend_security_group_id" {
  description = "Backend task security group ID; use this for the one-off migration task."
  value       = aws_security_group.backend.id
}

output "evidence_bucket_name" {
  description = "Private S3 bucket used by the backend for uploaded evidence."
  value       = aws_s3_bucket.evidence.bucket
}

output "database_endpoint" {
  description = "Private RDS endpoint. It is not reachable from the public internet."
  value       = aws_db_instance.main.address
}

output "github_actions_role_arn" {
  description = "OIDC role ARN to configure as the AWS_ROLE_ARN GitHub environment variable."
  value       = aws_iam_role.github_actions.arn
}

output "github_environment_name" {
  description = "GitHub environment name required by the OIDC trust policy."
  value       = var.github_environment
}
