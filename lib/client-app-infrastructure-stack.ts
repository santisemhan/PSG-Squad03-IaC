import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as secretsManager from 'aws-cdk-lib/aws-secretsmanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';

export class ClientAppInfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Parameters
    const labName = new cdk.CfnParameter(this, 'LabName', {
      type: 'String',
      description: 'Lab Name',
      default: 'PSG-Client',
    });

    const subnetPublic1CIDR = new cdk.CfnParameter(this, 'SubnetPublic1CIDR', {
      type: 'String',
      description: 'Please enter the IP range (CIDR notation) for the public subnet in the first Availability Zone',
      default: '10.0.0.0/24',
    });

    const subnetPublic2CIDR = new cdk.CfnParameter(this, 'SubnetPublic2CIDR', {
      type: 'String',
      description: 'Please enter the IP range (CIDR notation) for the public subnet in the second Availability Zone',
      default: '10.0.1.0/24',
    });

    const subnetPrivate1CIDR = new cdk.CfnParameter(this, 'SubnetPrivate1CIDR', {
      type: 'String',
      description: 'Please enter the IP range (CIDR notation) for the private subnet in the first Availability Zone',
      default: '10.0.2.0/24',
    });

    const subnetPrivate2CIDR = new cdk.CfnParameter(this, 'SubnetPrivate2CIDR', {
      type: 'String',
      description: 'Please enter the IP range (CIDR notation) for the private subnet in the second Availability Zone',
      default: '10.0.3.0/24',
    });

    const bastionSshIpCIDR = new cdk.CfnParameter(this, 'BastionSshIpCIDR', {
      type: 'String',
      description: 'Please enter your IP range (CIDR notation) for access to the bastion host by SSH',
      default: '0.0.0.0/0',
    });

    const latestAmiId = new cdk.CfnParameter(this, 'LatestAmiId', {
      type: 'AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>',
      description: 'Gets the latest AMI from Systems Manager Parameter store',
      default: '/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2',
    });

    const latestAmiIdNet = new cdk.CfnParameter(this, 'LatestAmiIdNet', {
      type: 'AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>',
      description: 'Gets the latest AMI from Systems Manager Parameter store',
      default: '/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2',
      /* default: '/aws/service/ami-amazon-linux-latest/amzn2-x86_64-MATEDE_DOTNET' */
    });
    
    // Infraestructure
    const keyName = new ec2.CfnKeyPair(this, 'PSGClientKey', {
      keyName: 'psg-client-key',  
    })

    const vpc = new ec2.CfnVPC(this, 'Vpc', {
      cidrBlock: '10.0.0.0/16',
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    const internetGateway = new ec2.CfnInternetGateway(this, "InternetGateway", {
      tags: [{
        key: 'Name',
        value: labName.valueAsString
      }]
    })

    const internetGatewayAttachment = new ec2.CfnVPCGatewayAttachment(this, "InternetGatewayAttachment", {
      internetGatewayId: internetGateway.ref,
      vpcId: vpc.ref
    })

    const subnetPublic1 = new ec2.CfnSubnet(this, 'MySubnetPublic1', {
      vpcId: vpc.ref,
      availabilityZone: 'us-east-1a',
      cidrBlock: subnetPublic1CIDR.valueAsString, 
      mapPublicIpOnLaunch: true,
      tags: [{
        key: 'Name',
        value: `${labName.valueAsString} Subnet Public A`
      }]
    });

    const subnetPublic2 = new ec2.CfnSubnet(this, 'MySubnetPublic2', {
      vpcId: vpc.ref,
      availabilityZone: 'us-east-1b',
      cidrBlock: subnetPublic2CIDR.valueAsString, 
      mapPublicIpOnLaunch: true,
      tags: [{
        key: 'Name',
        value: `${labName.valueAsString} Subnet Public B`
      }]
    });

    const subnetPrivate1 = new ec2.CfnSubnet(this, 'SubnetPrivate1', {
      vpcId: vpc.ref,
      availabilityZone: 'us-east-1a',
      cidrBlock: subnetPrivate1CIDR.valueAsString,
      mapPublicIpOnLaunch: false,
      tags: [{
        key: 'Name',
        value: `${labName.valueAsString} Subnet Private A`
      }]
    });

    const subnetPrivate2 = new ec2.CfnSubnet(this, 'SubnetPrivate2', {
      vpcId: vpc.ref,
      availabilityZone: 'us-east-1b',
      cidrBlock: subnetPrivate2CIDR.valueAsString,
      mapPublicIpOnLaunch: false,
      tags: [{
        key: 'Name',
        value: `${labName.valueAsString} Subnet Private B`
      }]
    });

    const publicRouteTable = new ec2.CfnRouteTable(this, 'PublicRouteTable', {
      vpcId: vpc.ref,
      tags: [{
        key: 'Name',
        value: `${labName.valueAsString} Public RT`
      }]
    });

    const defaultPublicRoute = new ec2.CfnRoute(this, 'DefaultPublicRoute', {
      routeTableId: publicRouteTable.ref,
      destinationCidrBlock: '0.0.0.0/0',
      gatewayId: internetGateway.ref
    });
    defaultPublicRoute.addDependency(internetGatewayAttachment)

    const subnetPublic1RouteTableAssociation = new ec2.CfnSubnetRouteTableAssociation(this, 'SubnetPublic1RouteTableAssociation', {
      routeTableId: publicRouteTable.ref,
      subnetId: subnetPublic1.ref
    });

    const subnetPublic2RouteTableAssociation = new ec2.CfnSubnetRouteTableAssociation(this, 'SubnetPublic2RouteTableAssociation', {
      routeTableId: publicRouteTable.ref,
      subnetId: subnetPublic2.ref
    });

    const privateRouteTable = new ec2.CfnRouteTable(this, 'PrivateRouteTable', {
      vpcId: vpc.ref,
      tags: [{
        key: 'Name',
        value: `${labName.valueAsString} Private RT`
      }]
    })

    const subnetPrivate1RouteTableAssociation = new ec2.CfnSubnetRouteTableAssociation(this, 'SubnetPrivate1RouteTableAssociation', {
      routeTableId: privateRouteTable.ref,
      subnetId: subnetPrivate1.ref
    })

    const subnetPrivate2RouteTableAssociation = new ec2.CfnSubnetRouteTableAssociation(this, 'SubnetPrivate2RouteTableAssociation', {
      routeTableId: privateRouteTable.ref,
      subnetId: subnetPrivate2.ref
    })

    const dBSubnetGroup = new rds.CfnDBSubnetGroup(this, 'DBSubnetGroup', {
      dbSubnetGroupDescription: 'DB subnet group',
      subnetIds: [subnetPrivate1.ref, subnetPrivate2.ref]
    })

    const securityGroupNoIngress = new ec2.CfnSecurityGroup(this, 'SecurityGroupNoIngress', {
      groupName: 'no-ingress-sg',
      groupDescription: 'Security group with no ingress rule',
      vpcId: vpc.ref
    })

    const securityGroupWebDMZ = new ec2.CfnSecurityGroup(this, 'SecurityGroupWebDMZ', {
      groupName: 'Web-DMZ-SG',
      groupDescription: 'Web DMZ Security Group',
      vpcId: vpc.ref,
      securityGroupIngress: [{
        ipProtocol: 'tcp',
        fromPort: 80,
        toPort: 80,
        cidrIp: '0.0.0.0/0'
      }, {
        ipProtocol: 'tcp',
        fromPort: 22,
        toPort: 22,
        cidrIp: bastionSshIpCIDR.valueAsString
      }]
    })

    const securityGroupDB = new ec2.CfnSecurityGroup(this, "SecurityGroupDB", {
      groupName: 'DB-SG',
      groupDescription: 'Database Security Group',
      vpcId: vpc.ref,
      securityGroupIngress: [{
        ipProtocol: 'tcp',
        fromPort: 3306,
        toPort: 3306,
        sourceSecurityGroupId: securityGroupWebDMZ.ref
      }, {
        ipProtocol: 'tcp',
        fromPort: 22,
        toPort: 22,
        sourceSecurityGroupId: securityGroupWebDMZ.ref
      }]
    })

    const frontendInstance = new ec2.CfnInstance(this, "FrontendInstance", {
      instanceType: 't2.micro',
      imageId: latestAmiId.valueAsString,
      keyName: keyName.ref,
      networkInterfaces: [{
        associatePublicIpAddress: true,
        deviceIndex: "0",
        groupSet: [securityGroupWebDMZ.ref],
        subnetId: subnetPublic1.ref
      }],
      tags: [{
        key: "Name",
        value: "PSG Client Frontend Site"
      }],
      userData: cdk.Fn.base64(
        `#!/bin/bash
        sudo su -
        yum update -y 
        curl -sL https://rpm.nodesource.com/setup_16.x | sudo bash -
        yum install -y nodejs
        npm install -g npm@latest pm2

        # Nginx config
        amazon-linux-extras install nginx1 -y
        systemctl enable nginx
        echo "server {
  listen 80;
  server_name psg-client.com;
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $!host;
    proxy_set_header X-Real-IP $!remote_addr;
    proxy_set_header X-Forwarded-For $!proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $!scheme;
  }
}" > /etc/nginx/conf.d/psg-client.conf
      systemctl restart nginx

        # Install PSG-Client-Frontend
        yum install -y git
        git clone https://github.com/santisemhan/PSG-Squad03-WebApp.git /var/www/html
        chown -R 755 /var/www/html
        cd /var/www/html
echo "NEXT_PUBLIC_API_URL=${process.env.NEXT_PUBLIC_API_URL}
NEXT_PUBLIC_FIREBASE_API_KEY=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}
NEXT_PUBLIC_FIREBASE_APP_ID=${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}" > .env
        npm install
        pm2 start npm --name "next" -- run dev
        `)
    })

    const backendInstance = new ec2.CfnInstance(this, "BackendInstance", {
      instanceType: 't2.micro',
      imageId: latestAmiIdNet.valueAsString,
      keyName: keyName.ref,
      networkInterfaces: [{
        associatePublicIpAddress: false,
        deviceIndex: "0",
        groupSet: [securityGroupDB.ref],
        subnetId: subnetPrivate1.ref
      }],
      tags: [{
        key: "Name",
        value: "PSG Client Backend Site"
      }],
      userData: cdk.Fn.base64(
        `#!/bin/bash
          sudo su -
          yum update -y
          yum install -y git
          yum install -y dotnet-sdk-6.0

          # Install PSG-Client-Backend
          git clone https://github.com/santisemhan/PSG-Squad03.git /var/www/html
          chown -R 755 /var/www/html`)
    })

    // I create the secret without its keys and values ​​so that they are not exposed and lose their confidentiality
    const authSecret = new secretsManager.Secret(this, 'AuthSecret'); 

    // Output
    const vpcCreated = new cdk.CfnOutput(this, 'VPCCreated', {
      description: 'VPC Created',
      value: vpc.ref,
    });
    
    const subnetsPublicCreated = new cdk.CfnOutput(this, 'subnetsPublicCreated', {
      description: 'A list of the public subnets',
      value: `${subnetPublic1.ref}, ${subnetPublic2.ref}`,
    });
    
    const subnetsPrivateCreated = new cdk.CfnOutput(this, 'SubnetsPrivateCreated', {
      description: 'A list of the private subnets',
      value: `${subnetPrivate1.ref}, ${subnetPrivate2.ref}`,
    });
    
    const subnetPublic1Created = new cdk.CfnOutput(this, 'SubnetPublic1Created', {
      description: 'Public subnet in the Availability Zone A',
      value: subnetPublic1.ref,
    });
    
    const subnetPublic2Created = new cdk.CfnOutput(this, 'SubnetPublic2Created', {
      description: 'Public subnet in the Availability Zone B',
      value: subnetPublic2.ref,
    });
    
    const subnetPrivate1Created = new cdk.CfnOutput(this, 'SubnetPrivate1Created', {
      description: 'Private subnet in the Availability Zone A',
      value: subnetPrivate1.ref,
    });
    
    const subnetPrivate2Created = new cdk.CfnOutput(this, 'SubnetPrivate2Created', {
      description: 'Private subnet in the Availability Zone B',
      value: subnetPrivate2.ref,
    });
    
    const securityGroupNoIngressCreated = new cdk.CfnOutput(this, 'SecurityGroupNoIngressCreated', {
      description: 'Security group with no ingress rule',
      value: securityGroupNoIngress.ref,
    });
    
    const PSGClientWebSitesCreated = new cdk.CfnOutput(this, 'PSGClientWebSitesCreated', {
      description: 'Frontend Available on',
      value: frontendInstance.attrPublicIp,
      exportName: `${this.stackName}-Frontend-PublicIp`,
    });
  }
}
