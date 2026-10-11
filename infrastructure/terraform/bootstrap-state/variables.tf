variable "aws_region" {
  description = "AWS region where the Terraform state bucket is created."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short lowercase project name used in the state bucket name."
  type        = string
  default     = "campusshield"
}
