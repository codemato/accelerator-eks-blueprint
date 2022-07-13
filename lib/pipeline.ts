// lib/pipeline.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { TeamPlatform, TeamApplication } from '../teams'; // HERE WE IMPORT TEAMS

export default class PipelineConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: cdk.StackProps){
    super(scope,id)

    const account = props?.env?.account!;
    const region = props?.env?.region!;

    const blueprint = blueprints.EksBlueprint.builder()
    .account(account)
    .region(region)
    .addOns( 
      new blueprints.CalicoAddOn,
      new blueprints.KedaAddOn,
      new blueprints.CalicoAddOn,
      new blueprints.MetricsServerAddOn,
      new blueprints.ClusterAutoScalerAddOn,
      new blueprints.ContainerInsightsAddOn,
      new blueprints.AwsLoadBalancerControllerAddOn(),
      new blueprints.XrayAddOn()
    )
    .teams(new TeamPlatform(account), new TeamApplication('backend',account));
  
    blueprints.CodePipelineStack.builder()
      .name("eks-blueprints-accelerator-pipeline")
      .owner("codemato")
      .repository({
          repoUrl: 'accelerator-eks-blueprint',
          credentialsSecretName: 'github-token',
          targetRevision: 'main'
      })
      // WE ADD THE STAGES IN WAVE FROM THE PREVIOUS CODE
      .wave({
        id: "envs",
        stages: [
          { id: "dev", stackBuilder: blueprint.clone('ap-south-1')},
          { id: "test", stackBuilder: blueprint.clone('ap-southeast-1')},
          { id: "prod", stackBuilder: blueprint.clone('ap-southeast-2')}
        ]
      })
      .build(scope, id+'-stack', props);
  }
}
