#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ClientAppInfrastructureStack } from '../lib/client-app-infrastructure-stack';
import { DefaultStackSynthesizer } from 'aws-cdk-lib';

const defaultStackSynthesizer = new DefaultStackSynthesizer({
  // Name of the S3 bucket for file assets
  fileAssetsBucketName:
    "cdk-${Qualifier}-assets-${AWS::AccountId}-${AWS::Region}",
  bucketPrefix: "",

  // Name of the ECR repository for Docker image assets
  imageAssetsRepositoryName:
    "cdk-${Qualifier}-container-assets-${AWS::AccountId}-${AWS::Region}",

  // ARN of the role assumed by the CLI and Pipeline to deploy here
  deployRoleArn: "arn:${AWS::Partition}:iam::${AWS::AccountId}:role/LabRole",
  deployRoleExternalId: "",

  // ARN of the role used for file asset publishing (assumed from the deploy role)
  fileAssetPublishingRoleArn:
    "arn:${AWS::Partition}:iam::${AWS::AccountId}:role/LabRole",
  fileAssetPublishingExternalId: "",

  // ARN of the role used for Docker asset publishing (assumed from the deploy role)
  imageAssetPublishingRoleArn:
    "arn:${AWS::Partition}:iam::${AWS::AccountId}:role/LabRole",
  imageAssetPublishingExternalId: "",

  // ARN of the role passed to CloudFormation to execute the deployments
  cloudFormationExecutionRole:
    "arn:${AWS::Partition}:iam::${AWS::AccountId}:role/LabRole",

  // ARN of the role used to look up context information in an environment
  lookupRoleArn: "arn:${AWS::Partition}:iam::${AWS::AccountId}:role/LabRole",
  lookupRoleExternalId: "",

  // Name of the SSM parameter which describes the bootstrap stack version number
  bootstrapStackVersionSsmParameter: "/cdk-bootstrap/${Qualifier}/version",

  // Add a rule to every template which verifies the required bootstrap stack version
  generateBootstrapVersionRule: true,
});

const app = new cdk.App();
new ClientAppInfrastructureStack(app, 'ClientAppInfrastructureStack', {
  synthesizer: defaultStackSynthesizer,
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
});

app.synth();