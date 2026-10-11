# CampusShield AWS infrastructure

This root Terraform configuration provisions a first AWS environment for
CampusShield. It does not run automatically; `terraform apply` is a deliberate
manual action. Review the plan and expected costs before approving it.

## Resources created

- VPC across two Availability Zones, public and private subnets, Internet
  Gateway, NAT gateway(s), and an S3 gateway endpoint
- Public Application Load Balancer; `/api/*` routes to FastAPI and all other
  paths route to the React/Nginx frontend
- ECS Fargate cluster and task/service definitions in private subnets
- Private PostgreSQL RDS instance, security-group restricted to the backend
- Private, encrypted, versioned S3 bucket for evidence uploads
- ECR repositories, Secrets Manager secrets, scoped ECS IAM roles, CloudWatch
  log groups, and an unhealthy-target alarm
- GitHub Actions OIDC provider and a deployment role restricted to the configured
  repository and GitHub environment

The backend uses the S3 bucket through its ECS task role. Local Docker Compose
continues to store uploaded evidence on disk. Demo accounts are disabled in the
AWS task definition.

## Cost and safety defaults

The `dev` defaults create billable resources, even before application tasks are
enabled. The ALB, one NAT gateway, RDS, Secrets Manager, CloudWatch, and any
running Fargate tasks can all incur charges. A NAT gateway and ALB are billed
while idle. The single NAT gateway is a dev cost optimization, not an
Availability-Zone-resilient production design.

Production variables require HTTPS, two NAT gateways, Multi-AZ RDS, at least
two tasks per service, at least seven days of RDS backups, and a 30-day secret
recovery window. These defaults are substantially more expensive. Provide a
valid ACM certificate ARN in the same region before planning production.

The generated DB/JWT secrets are stored in Terraform state. Do not commit state
or share it unencrypted. Use the state-bucket bootstrap below before applying
the main stack; it creates a private, encrypted, versioned S3 bucket for state.
The bootstrap state itself is local and contains no application secrets.

## Prepare and plan

Use AWS IAM Identity Center or an assumed role rather than root credentials or
long-lived IAM user keys. For example, after configuring an SSO profile:

```sh
aws sso login --profile campusshield
export AWS_PROFILE=campusshield
aws sts get-caller-identity
```

Create and review the state bucket first:

```sh
cd infrastructure/terraform/bootstrap-state
terraform init
terraform fmt -check
terraform validate
terraform plan
```

Apply only after confirming that plan creates the expected state bucket:

```sh
terraform apply
terraform output -raw state_bucket_name
```

Copy the printed bucket name, then initialize the main stack:

```sh
cd ..
terraform init \
  -backend-config="bucket=PASTE_STATE_BUCKET_NAME" \
  -backend-config="key=campusshield/dev/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="encrypt=true" \
  -backend-config="use_lockfile=true"
```

Before planning the application stack, check whether this AWS account already
has GitHub's OIDC provider. It is account-wide and can be registered only once:

```sh
aws iam list-open-id-connect-providers
```

If `token.actions.githubusercontent.com` already exists, import that provider
into the main Terraform state before planning:

```sh
terraform import aws_iam_openid_connect_provider.github \
  arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com
```

Terraform configuration is at this directory root, not in environment
subdirectories:

```sh
terraform fmt -check -recursive
terraform validate
terraform plan -var-file=environments/dev/terraform.tfvars.example
```

Copy the example to an ignored file for real settings:

```sh
cp environments/dev/terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` to match your AWS region, domain/certificate choice,
and expected costs. Do not add AWS credentials, API keys, or passwords to this
file. Verify the active AWS identity before every plan/apply with
`aws sts get-caller-identity`. Restrict access to the encrypted remote state.

Read the entire plan. The initial apply creates infrastructure and registers
task definitions but keeps ECS services at zero tasks (`enable_services=false`)
so Terraform does not try to pull images that do not exist yet. The initial
apply is still billable because it creates the ALB, NAT, RDS, and other
resources.

## First application deployment

1. Apply the infrastructure plan with `enable_services=false`.
2. Use the ECR repository URLs from `terraform output` to authenticate and push
   both application images tagged `bootstrap`. Build for `linux/amd64` when
   working from an Apple Silicon Mac.
3. Run `bash infrastructure/terraform/run-migrations.sh` once to launch the
   one-off private ECS task with the latest backend task definition. Confirm it
   exits successfully before proceeding.
4. Set `enable_services=true` in `terraform.tfvars`; run `terraform plan` and
   inspect it. Then apply to start one dev task per service.
5. Configure the GitHub `dev` environment variables from Terraform outputs:
   `AWS_REGION`, `AWS_ROLE_ARN`, `BACKEND_ECR_REPOSITORY`,
   `FRONTEND_ECR_REPOSITORY`, `ECS_CLUSTER`, `BACKEND_SERVICE`,
   `FRONTEND_SERVICE`, `PRIVATE_SUBNET_IDS` (comma-separated),
   `BACKEND_SECURITY_GROUP_ID`, and `APP_BASE_URL`.
6. Run the GitHub Actions deploy workflow manually once to validate OIDC and
   the migration/deployment path. Successful CI runs on `main` also trigger dev
   deployment automatically.
7. Verify the output URL, `/health/ready`, and the login/report/evidence flow.

The deploy workflow uses OIDC and ECS deployment circuit breakers. Database
migrations must be backward-compatible because a failed release cannot
automatically reverse schema changes. The ECS circuit breaker rolls back a
service deployment if tasks fail health checks; operators must still inspect
the migration task and CloudWatch logs if deployment fails.

Production demo accounts are disabled. The repository does not yet provide a
secure first-administrator bootstrap process; implement and verify one before
opening a production deployment to users. Do not enable the hard-coded demo
accounts in a public environment.

## GitHub repository settings still required

After pushing these workflow changes and confirming one successful CI run:

1. Protect `main` with a pull request requirement and require the CI job checks
   `Backend tests`, `Frontend lint & build`, `Secret scanning`,
   `Terraform validation`, `Backend image scan (Trivy)`, `Frontend image scan`,
   and `Dependency review`.
2. Create a GitHub Actions environment named `dev` and add the variables listed
   above. Do not add AWS access keys; the workflow authenticates with OIDC.
3. Restrict who can deploy through the GitHub environment if required.

Branch protection and environment variables are repository settings, not
Terraform resources, and are deliberately not changed automatically.

## Tear down

`terraform destroy` deletes billable infrastructure. Production RDS deletion
protection is enabled and S3 buckets are not force-deleted, so data removal
requires deliberate manual steps. Preserve and verify any needed database or
evidence backups before destroying an environment.
