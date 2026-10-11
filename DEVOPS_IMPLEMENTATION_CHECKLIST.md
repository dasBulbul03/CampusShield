# CampusShield DevOps Implementation Checklist

This checklist tracks the production-readiness work for CampusShield on AWS.
Terraform and container readiness are implemented in the repository, but no
AWS resources have been created.

## Repository audit

- [x] Inspect repository, README, implementation plan, Dockerfiles, Compose,
  Nginx, CI, backend configuration, migrations, auth, uploads and health checks
- [x] Record production blockers and preserve local Docker Compose behavior

## Application and container readiness

- [x] Keep local Docker Compose development behavior
- [x] Route `/api/*` at the ALB to FastAPI, avoiding reliance on the Compose-only
  backend hostname in the deployed request path
- [x] Keep evidence behind authenticated API routes; persist AWS evidence in a
  private S3 bucket through the ECS backend task role
- [x] Configure ECS container and ALB health checks
- [x] Run backend as non-root and frontend on the Nginx unprivileged image
- [x] Avoid frontend secrets and disable demo-user seeding in the AWS task
- [x] Run backend tests and build both container images locally

## CI

- [x] Backend tests/coverage and frontend lint/build
- [x] Backend and frontend dependency audit gates
- [x] Backend and frontend image scans
- [x] Secret scanning
- [x] Terraform format, init, validate and configuration scan
- [x] Pin third-party GitHub Actions to immutable SHAs
- [ ] Configure GitHub required checks and branch protection

## Terraform AWS foundation

- [x] Two-AZ VPC with public/private subnets, NAT, and an S3 gateway endpoint
- [x] Public ALB, API/frontend routing, optional HTTPS using an existing ACM cert
- [x] ECR repositories and Fargate task/service definitions
- [x] Private RDS PostgreSQL and private evidence S3 bucket
- [x] Secrets Manager values, scoped ECS IAM roles, CloudWatch logs and target alarm
- [x] GitHub OIDC provider and repo/environment-scoped deploy role
- [x] Dev-first defaults and stricter production validations
- [x] Add encrypted/versioned S3 state bootstrap and native state locking
- [ ] Review an AWS-backed Terraform plan and manually apply it

## Deployment automation and operations

- [x] Create GitHub Actions OIDC role with least privilege
- [x] Replace deployment placeholder with image push, migration, ECS rollout,
  smoke tests and ECS circuit-breaker rollback
- [ ] Configure GitHub `dev` environment variables from Terraform outputs
- [ ] Push the workflow changes and verify successful GitHub Actions runs
- [ ] Add CloudWatch alert destinations/dashboards and operational runbooks
- [ ] Add custom Route53 records if a domain is used
- [ ] Implement a secure, one-time initial administrator bootstrap before any
  public production launch

## Manual work required

1. Choose the AWS account and region; use IAM Identity Center or an assumed IAM
   role for local Terraform, not root credentials or long-lived keys if avoidable.
2. Configure encrypted/versioned remote state and locking before shared or
   production use. Terraform state contains generated secrets.
3. Request/validate an ACM certificate in the target AWS region before a
   production plan.
4. Run the plan from `infrastructure/terraform`, inspect every resource and
   estimated cost, and apply only after review.
5. Complete bootstrap image push and one-off migration before enabling ECS tasks.
6. Configure GitHub environment variables from Terraform outputs, then verify
   Actions can assume the OIDC role.
7. Configure required checks and branch protection after CI has run at least
   once with the new job names.

## Recommended next step

Set up secure Terraform state and AWS credentials, then run and review a
dev-only plan. Do not apply the production example until its certificate,
backup, Multi-AZ, sizing, and cost settings are confirmed.
