#!/bin/bash
# ─────────────────────────────────────────────────────────
# LUMA V1 — Production Deploy Script
#
# Prerequisites:
#   1. AWS CLI configured (aws configure)
#   2. Docker installed
#   3. Terraform state backend bootstrapped
#   4. Production env vars set in AWS Secrets Manager
#
# Usage: ./scripts/deploy-prod.sh
# ─────────────────────────────────────────────────────────

set -euo pipefail

# ─── Configuration ──────────────────────────────────────
AWS_REGION="${AWS_REGION:-eu-west-1}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/luma-production"
IMAGE_TAG="$(git rev-parse --short HEAD)"
ECS_CLUSTER="luma-production"
ECS_SERVICE="luma-production-backend"

echo "========================================="
echo "  LUMA Production Deploy"
echo "  Commit: ${IMAGE_TAG}"
echo "  Region: ${AWS_REGION}"
echo "========================================="

# ─── Step 1: Build shared package ───────────────────────
echo ""
echo "[1/6] Building shared package..."
npm run shared:build

# ─── Step 2: Run tests ─────────────────────────────────
echo ""
echo "[2/6] Running tests..."
npm run test --workspace=apps/backend -- --passWithNoTests

# ─── Step 3: Docker build ──────────────────────────────
echo ""
echo "[3/6] Building Docker image..."
docker build -t "${ECR_REPO}:${IMAGE_TAG}" -t "${ECR_REPO}:latest" -f apps/backend/Dockerfile .

# ─── Step 4: Push to ECR ───────────────────────────────
echo ""
echo "[4/6] Pushing to ECR..."
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_REPO}"
docker push "${ECR_REPO}:${IMAGE_TAG}"
docker push "${ECR_REPO}:latest"

# ─── Step 5: Run database migrations ───────────────────
echo ""
echo "[5/6] Running database migrations..."
# Migrations run via ECS task before the new version starts
aws ecs run-task \
  --cluster "${ECS_CLUSTER}" \
  --task-definition "luma-production-migrate" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$(aws ec2 describe-subnets --filters 'Name=tag:Name,Values=*luma*private*' --query 'Subnets[*].SubnetId' --output text | tr '\t' ',')],securityGroups=[$(aws ec2 describe-security-groups --filters 'Name=tag:Name,Values=*luma*ecs*' --query 'SecurityGroups[0].GroupId' --output text)]}" \
  --overrides '{"containerOverrides":[{"name":"luma-backend","command":["npx","prisma","migrate","deploy","--schema=apps/backend/src/prisma/schema.prisma"]}]}' \
  --region "${AWS_REGION}" \
  --no-cli-pager

echo "Waiting for migration to complete..."
sleep 30

# ─── Step 6: Update ECS service ────────────────────────
echo ""
echo "[6/6] Updating ECS service..."
aws ecs update-service \
  --cluster "${ECS_CLUSTER}" \
  --service "${ECS_SERVICE}" \
  --force-new-deployment \
  --region "${AWS_REGION}" \
  --no-cli-pager

echo ""
echo "========================================="
echo "  Deploy started!"
echo "  Image: ${ECR_REPO}:${IMAGE_TAG}"
echo ""
echo "  Monitor:"
echo "  aws ecs describe-services --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE} --query 'services[0].deployments'"
echo "========================================="
