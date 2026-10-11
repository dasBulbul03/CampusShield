output "state_bucket_name" {
  description = "Use this bucket for the main Terraform S3 backend."
  value       = aws_s3_bucket.terraform_state.bucket
}

output "state_key_dev" {
  description = "Example object key for the dev environment state."
  value       = "campusshield/dev/terraform.tfstate"
}
