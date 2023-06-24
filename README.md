<div align="center" id="top">
  <img src="https://github.com/santisemhan/PSG-Squad03-API/assets/58712215/2b3f5249-7797-48a0-9682-523976355cf3" width="75" alt="PSG Logo" />
</div>

<div align="center">
  <h1>PSG Users - IaC</h1>
  <h3>Infrastructure as a code for the PSG-Users module </h3>
</div>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Amazon_AWS-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white"/>
</p>


<p align="center">
  <a>About</a> &#xa0; | &#xa0;
  <a>Get Started</a>  &#xa0; | &#xa0;
  <a>Documentation</a> &#xa0;
</p>

## :dart: About ##
This repository contains the infrastructure-as-code for the PSG-Users microservice. The infrastructure is deployed on AWS using AWS CDK with TypeScript for the creation of CloudFormation resources.
 

## :checkered_flag: Get Started ##
The `cdk.json` file tells the CDK Toolkit how to execute your app.

```bash
# Clone this project
$ git clone https://github.com/santisemhan/PSG-Squad03-IaC.git

# On proyect folder
$ cd PSG-Squad03-IaC

# Change to 16.19.1 node version
$ nvm use 16.19.1
$ npm install

# Build
$ npm run bootstrap

# Deploy
$ npm run deploy
```

## :video_game: Scripts

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npm run deploy`      deploy this stack to your default AWS account/region
* `npm run diff`        compare deployed stack with current state
* `npm run synth`       emits the synthesized CloudFormation template

##  :zap: Infrastructure ##
<div>
  <img src="https://github.com/santisemhan/PSG-Squad03-IaC/assets/58712215/0e3742d2-bdb6-4bf1-aac3-78f6980ebcfb" width="900" alt="PSG Users CloudFormation" />
</div>


<br/>
