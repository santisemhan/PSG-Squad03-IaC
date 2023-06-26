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

    const dotnetAmiId = new cdk.CfnParameter(this, 'dotnetAmiId', {
      type: 'String',
      description: '.NET Core 6, Mono 6.12, PowerShell 7, and MATE DE pre-installed to run your .NET applications on Amazon Linux 2 with Long Term Support (LTS).',
      default: 'ami-005b11f8b84489615',
    });

    const mssql19AmiId = new cdk.CfnParameter(this, 'mssql19AmiId', {
      type: 'String',
      description: 'Amazon Linux 2 with SQL Server 2019 Standard Edition AMI provided by Amazon.',
      default: 'ami-0874d82d2138e9fd1',
    });

    const keyName = new cdk.CfnParameter(this, 'PSGClientKey', {
      type: 'String',
      default: 'psg-client-key',
    })

    // Infraestructure
    const vpc = new ec2.CfnVPC(this, 'Vpc', {
      cidrBlock: '10.0.0.0/16',
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    const internetGateway = new ec2.CfnInternetGateway(this, "InternetGateway", {
      tags: [{
        key: 'Name',
        value: `${labName.valueAsString} InternetGateway`
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
      gatewayId: internetGateway.ref,
    });
    defaultPublicRoute.addDependency(internetGatewayAttachment);

    const subnetPublic1RouteTableAssociation = new ec2.CfnSubnetRouteTableAssociation(this, 'SubnetPublic1RouteTableAssociation', {
      routeTableId: publicRouteTable.ref,
      subnetId: subnetPublic1.ref
    });

    const subnetPublic2RouteTableAssociation = new ec2.CfnSubnetRouteTableAssociation(this, 'SubnetPublic2RouteTableAssociation', {
      routeTableId: publicRouteTable.ref,
      subnetId: subnetPublic2.ref
    });

    const eIP = new ec2.CfnEIP(this, "eIP", {
      domain: vpc.ref,
      tags: [{
        key: 'Name',
        value: `${labName.valueAsString} - eIP`
      }]
    });

    const natGateway = new ec2.CfnNatGateway(this, "NAT-Gateway", {
      subnetId: subnetPublic1.ref,
      allocationId: eIP.attrAllocationId,
      tags: [{
        key: 'Name',
        value: `${labName.valueAsString} NAT-Gateway`
      }]
    })
    natGateway.addDependency(eIP);

    const privateRouteTable = new ec2.CfnRouteTable(this, 'PrivateRouteTable', {
      vpcId: vpc.ref,
      tags: [{
        key: 'Name',
        value: `${labName.valueAsString} Private RT`
      }]
    });

    const defaultPrivateRoute = new ec2.CfnRoute(this, 'DefaultPrievateRoute', {
      routeTableId: privateRouteTable.ref,
      destinationCidrBlock: '0.0.0.0/0',
      natGatewayId: natGateway.ref
    });
    defaultPrivateRoute.addDependency(natGateway);

    const subnetPrivate1RouteTableAssociation = new ec2.CfnSubnetRouteTableAssociation(this, 'SubnetPrivate1RouteTableAssociation', {
      routeTableId: privateRouteTable.ref,
      subnetId: subnetPrivate1.ref
    });

    const subnetPrivate2RouteTableAssociation = new ec2.CfnSubnetRouteTableAssociation(this, 'SubnetPrivate2RouteTableAssociation', {
      routeTableId: privateRouteTable.ref,
      subnetId: subnetPrivate2.ref
    });

    const dBSubnetGroup = new rds.CfnDBSubnetGroup(this, 'DBSubnetGroup', {
      dbSubnetGroupDescription: 'DB subnet group',
      subnetIds: [subnetPrivate1.ref, subnetPrivate2.ref]
    });

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
    });

    const securityGroupDB = new ec2.CfnSecurityGroup(this, "SecurityGroupDB", {
      groupName: 'DB-SG',
      groupDescription: 'Database Security Group',
      vpcId: vpc.ref,
      securityGroupIngress: [
        {
          ipProtocol: 'tcp',
          fromPort: 22,
          toPort: 22,
          sourceSecurityGroupId: securityGroupWebDMZ.ref
        }, {
          ipProtocol: '-1',
          fromPort: -1,
          toPort: -1,
          cidrIp: '10.0.0.0/16'
        }],
      securityGroupEgress: [
        {
          ipProtocol: '-1',
          fromPort: -1,
          toPort: -1,
          cidrIp: '0.0.0.0/0'
        }
      ]
    });

    /*
    const fullstackInstance = new ec2.CfnInstance(this, "FullstackInstance", {
    })
    */

    const frontendInstance = new ec2.CfnInstance(this, "FrontendInstance", {
      instanceType: 't2.micro',
      imageId: latestAmiId.valueAsString,
      keyName: keyName.valueAsString,
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
echo "### Custom User Deploy"
sudo su -
yum update -y 
curl -sL https://rpm.nodesource.com/setup_16.x | sudo bash -
yum install -y nodejs
npm install -g npm@latest pm2

echo "### Nginx config"
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

echo "### Deploy PSG-Client-Frontend"
yum install -y git
git clone https://github.com/santisemhan/PSG-Squad03-WebApp.git /var/www/html
chown -R 755 /var/www/html
cd /var/www/html
echo "NEXT_PUBLIC_API_URL=${process.env.NEXT_PUBLIC_API_URL}
NEXT_PUBLIC_FIREBASE_API_KEY=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}
NEXT_PUBLIC_FIREBASE_APP_ID=${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}" > .env

echo "### Start PM2"
cd /var/www/html
npm install
pm2 start npm --name "next" -- run dev
`)
    });
    frontendInstance.addDependency(defaultPublicRoute);

    const mongodbInstance = new ec2.CfnInstance(this, "MongoDBInstance", {
      instanceType: 't2.micro',
      imageId: latestAmiId.valueAsString,
      keyName: keyName.valueAsString,
      networkInterfaces: [{
        associatePublicIpAddress: false,
        deviceIndex: "0",
        groupSet: [securityGroupDB.ref],
        subnetId: subnetPrivate1.ref
      }],
      tags: [{
        key: "Name",
        value: "PSG Client MongoDB Instance"
      }],
      userData: cdk.Fn.base64(
        `#!/bin/bash
echo "### Custom User Deploy" 
sudo su -

echo "[mongodb-org-5.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2/mongodb-org/5.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-5.0.asc" > /etc/yum.repos.d/mongodb-org-5.0.repo

yum update -y
yum install -y mongodb-org
sudo systemctl enable mongod
sudo systemctl start mongod
`)
    });
    mongodbInstance.addDependency(defaultPrivateRoute);

    const mssqlInstance = new ec2.CfnInstance(this, "MSSQLInstance", {
      instanceType: 'm3.large',
      imageId: mssql19AmiId.valueAsString,
      keyName: keyName.valueAsString,
      networkInterfaces: [{
        associatePublicIpAddress: false,
        deviceIndex: "0",
        groupSet: [securityGroupDB.ref],
        subnetId: subnetPrivate1.ref
      }],
      tags: [{
        key: "Name",
        value: "PSG Client MSSQL Instance"
      }],
      userData: cdk.Fn.base64(
        `#!/bin/bash
echo "### Custom User Deploy" 
sudo su -
yum update -y

echo "### MSSQL Config"
echo 'export PATH="$PATH:/opt/mssql-tools/bin"' >> ~/.bash_profile
echo 'export PATH="$PATH:/opt/mssql-tools/bin"' >> ~/.bashrc
systemctl stop mssql-server
MSSQL_SA_PASSWORD='${process.env.MSSQL_SA_PASSWORD}' /opt/mssql/bin/mssql-conf set-sa-password
# mkfs -t ext4 /dev/xvdb
mkdir /SQLServerData
# mount /dev/xvdb /SQLServerData
# echo "/dev/xvdb /SQLServerData ext4 default,nofail 0" >> /etc/fstab
chown mssql:mssql /SQLServerData
# systemctl start mssql-server
/opt/mssql/bin/mssql-conf set filelocation.defaultdatadir /SQLServerData
systemctl restart mssql-server

echo "### MSSQL Prepare Script"
echo "CREATE DATABASE PSGUsers_dev;
GO
USE PSGUsers_dev;
GO" > /SQLServerData/psg_db_init.sql

echo "### MSQL Create Database"
. ~/.bash_profile
sqlcmd -S localhost -U sa -P '${process.env.MSSQL_SA_PASSWORD}' -i /SQLServerData/psg_db_init.sql -o /SQLServerData/psg_db_init_output.txt
`)
    });
    mssqlInstance.addDependency(defaultPrivateRoute);

    const backendInstance = new ec2.CfnInstance(this, "BackendInstance", {
      instanceType: 't2.micro',
      imageId: dotnetAmiId.valueAsString,
      keyName: keyName.valueAsString,
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
echo "### Custom User Deploy"
sudo su -
yum update -y
yum install -y git
yum install -y jq

echo "### Deploy PSG-Client-Backend"
git clone https://github.com/santisemhan/PSG-Squad03-API.git /var/www/html
chown -R 755 /var/www/html
export DOTNET_CLI_HOME=/tmp
echo "[Unit]
Description=Example of ASP.NET Core MVC App running on Amazon Linux

[Service]
WorkingDirectory=/var/www/html/client-app-backend
ExecStart=/usr/bin/dotnet run
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=dotnet
Environment=DOTNET_CLI_HOME=/temp

[Install]
WantedBy=multi-user.target" > /etc/systemd/system/dotnet.service

echo "### Add Config Backend"
touch /var/www/html/client-app-backend/appsettings.json.tmp
apptmp=/var/www/html/client-app-backend/appsettings.json.tmp
appjsn=/var/www/html/client-app-backend/appsettings.json

jq '.ServicesHosts.PSGCore.Url = "ws://127.0.0.1:8080/users"' "$appjsn" > "$apptmp" && mv -f "$apptmp" "$appjsn"
jq '.Databases.SQLServer.ConnectionString = "Data Source=127.0.0.1;Initial Catalog=PSGUsers_dev;User ID=sa;Password=${process.env.MSSQL_SA_PASSWORD};Connect Timeout=30;Encrypt=False;TrustServerCertificate=False;ApplicationIntent=ReadWrite;MultiSubnetFailover=False"' "$appjsn" > "$apptmp" && mv -f "$apptmp" "$appjsn"
jq '.Databases.Mongo.ConnectionString = "mongodb://127.0.0.1:27017"' "$appjsn" > "$apptmp" && mv -f "$apptmp" "$appjsn"
jq '.Databases.Mongo.Database = "PSG-Client"' "$appjsn" > "$apptmp" && mv -f "$apptmp" "$appjsn"

echo "### dotNET database update"
systemctl stop dotnet.service
cd /var/www/html/client-app-backend
dotnet tool install --global dotnet-ef --version 6
dotnet-ef database update

echo "### dotNET service"
systemctl enable dotnet.service
systemctl start dotnet.service
# systemctl status dotnet.service
`)
    })
    backendInstance.addDependency(defaultPrivateRoute);
    backendInstance.addDependency(mssqlInstance);
    backendInstance.addDependency(mongodbInstance);

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

    const PSGClientWebSitesCreated = new cdk.CfnOutput(this, 'PSGClientWebSitesCreated', {
      description: 'Frontend Available on',
      value: frontendInstance.attrPublicIp,
      exportName: `${this.stackName}-Frontend-PublicIp`,
    });

    const PSGClientBackedCreated = new cdk.CfnOutput(this, 'PSGClientBackendCreated', {
      description: 'Backend Avalilable on',
      value: backendInstance.attrPrivateIp,
      exportName: `${this.stackName}-Backend-PrivateIp`,
    });

    const PSGClientMSSQLCreated = new cdk.CfnOutput(this, 'PSGClientMSSQLCreated', {
      description: 'MSSQL Avalilable on',
      value: mssqlInstance.attrPrivateIp,
      exportName: `${this.stackName}-MSSQL-PrivateIp`,
    });

    const PSGClientMongoDBCreated = new cdk.CfnOutput(this, 'PSGClientMongoDBCreated', {
      description: 'MongoDB Avalilable on',
      value: mongodbInstance.attrPrivateIp,
      exportName: `${this.stackName}-MondoDB-PrivateIp`,
    });

  }
}
