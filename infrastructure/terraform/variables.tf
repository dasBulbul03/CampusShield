variable "aws_region" {
  description = "AWS region for the CampusShield deployment."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Lowercase project prefix used for resource names."
  type        = string
  default     = "campusshield"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,19}$", var.project_name))
    error_message = "project_name must be 3-20 lowercase letters, digits, or hyphens, starting with a letter."
  }
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "environment must be dev, staging, or production."
  }
}

variable "vpc_cidr" {
  description = "IPv4 CIDR block for the VPC. Two /24 public and two /24 private subnets are derived from it."
  type        = string
  default     = "10.20.0.0/16"
}

variable "acm_certificate_arn" {
  description = "Existing ACM certificate ARN in this region. Required for production; empty enables HTTP-only dev access."
  type        = string
  default     = ""

  validation {
    condition     = var.environment != "production" || var.acm_certificate_arn != ""
    error_message = "Production requires an ACM certificate ARN so the ALB uses HTTPS."
  }
}

variable "image_tag" {
  description = "Initial immutable image tag used by the Terraform-managed task definitions."
  type        = string
  default     = "bootstrap"
}

variable "enable_services" {
  description = "Set true only after bootstrap images have been pushed and the initial database migration has run."
  type        = bool
  default     = false
}

variable "desired_count" {
  description = "Number of running tasks per ECS service after enable_services is true."
  type        = number
  default     = 1

  validation {
    condition     = var.desired_count >= 1 && var.desired_count <= 10
    error_message = "desired_count must be between 1 and 10."
  }

  validation {
    condition     = var.environment != "production" || var.desired_count >= 2
    error_message = "Production requires at least two tasks per service."
  }
}

variable "backend_cpu" {
  description = "Fargate CPU units for the backend task."
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Fargate memory in MiB for the backend task."
  type        = number
  default     = 1024
}

variable "frontend_cpu" {
  description = "Fargate CPU units for the frontend task."
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Fargate memory in MiB for the frontend task."
  type        = number
  default     = 512
}

variable "db_username" {
  description = "PostgreSQL master username. The generated database password is stored in Secrets Manager."
  type        = string
  default     = "campusshield_admin"
  sensitive   = true
}

variable "database_instance_class" {
  description = "RDS instance class. The dev default is small and single-AZ; production needs a sizing review."
  type        = string
  default     = "db.t3.micro"
}

variable "postgres_engine_version" {
  description = "Optional exact PostgreSQL engine version. Empty lets AWS select the current default for the requested major version."
  type        = string
  default     = ""
}

variable "database_allocated_storage" {
  description = "Initial encrypted RDS storage in GiB."
  type        = number
  default     = 20
}

variable "database_max_allocated_storage" {
  description = "Maximum autoscaled RDS storage in GiB."
  type        = number
  default     = 100
}

variable "database_backup_retention_days" {
  description = "RDS automated backup retention. Production must keep at least seven days."
  type        = number
  default     = 1

  validation {
    condition     = var.environment != "production" || var.database_backup_retention_days >= 7
    error_message = "Production database backup retention must be at least seven days."
  }
}

variable "multi_az_database" {
  description = "Enable Multi-AZ RDS deployment. Recommended for production and increases cost."
  type        = bool
  default     = false

  validation {
    condition     = var.environment != "production" || var.multi_az_database
    error_message = "Production requires a Multi-AZ database deployment."
  }
}

variable "multi_az_nat" {
  description = "Create one NAT gateway per AZ. The dev default saves cost but makes private subnet egress dependent on one AZ."
  type        = bool
  default     = false

  validation {
    condition     = var.environment != "production" || var.multi_az_nat
    error_message = "Production requires a NAT gateway in each Availability Zone."
  }
}

variable "secret_recovery_window_days" {
  description = "Secrets Manager deletion recovery window. Use 30 in production; shorter windows are convenient for dev cleanup."
  type        = number
  default     = 7

  validation {
    condition     = var.secret_recovery_window_days >= 7 && var.secret_recovery_window_days <= 30
    error_message = "Secrets Manager recovery window must be between 7 and 30 days."
  }

  validation {
    condition     = var.environment != "production" || var.secret_recovery_window_days == 30
    error_message = "Production requires a 30-day Secrets Manager recovery window."
  }
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days."
  type        = number
  default     = 14
}

variable "gemini_api_key" {
  description = "Optional Gemini API key. Empty preserves the app's deterministic fallback analysis."
  type        = string
  default     = ""
  sensitive   = true
}

variable "gemini_model" {
  description = "Gemini model name passed to the backend."
  type        = string
  default     = "gemini-3.8-flash"
}

variable "github_repository" {
  description = "GitHub owner/repository allowed to deploy using OIDC."
  type        = string
  default     = "dasBulbul03/CampusShield"

  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repository))
    error_message = "github_repository must be in owner/repository format."
  }
}

variable "github_owner_id" {
  description = <<-EOT
    Numeric GitHub owner ID. GitHub's OIDC subject claim now qualifies the
    owner and repository with their numeric IDs, producing
    repo:owner@123456/name@789012:environment:dev rather than the older
    repo:owner/name:environment:dev. The IDs survive renames and transfers,
    so they are what AWS should match on. Find it with:
    gh api users/OWNER --jq .id   (or orgs/OWNER for an organisation)
  EOT
  type        = string
  default     = "194465775"
}

variable "github_repository_id" {
  description = <<-EOT
    Numeric GitHub repository ID. See github_owner_id. Find it with:
    gh api repos/OWNER/REPO --jq .id
  EOT
  type        = string
  default     = "1413688818"
}

variable "github_environment" {
  description = "GitHub Actions environment whose OIDC subject may assume the deployment role."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "production"], var.github_environment)
    error_message = "github_environment must be dev, staging, or production."
  }
}
