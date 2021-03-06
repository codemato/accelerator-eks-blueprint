// lib/pipeline.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { CapacityType, KubernetesVersion, NodegroupAmiType } from 'aws-cdk-lib/aws-eks';
import { InstanceType } from 'aws-cdk-lib/aws-ec2';
import { IstioBaseAddOn } from '../lib/istio-base';
import { IstioControlPlaneAddOn } from '../lib/istio-control-plane';
import { TeamPlatform, TeamApplication } from '../teams'; // HERE WE IMPORT TEAMS

export default class PipelineConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: cdk.StackProps){
    super(scope,id)
    const clusterProvider = new blueprints.GenericClusterProvider({
        version: KubernetesVersion.V1_21,
        managedNodeGroups: [
            {
                id: "mng1",
                amiType: NodegroupAmiType.AL2_X86_64,
                instanceTypes: [new InstanceType('m5.2xlarge')],
                diskSize: 25,
                nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT }
            },
            {
                id: "mng2",
                amiType: NodegroupAmiType.AL2_X86_64,
                instanceTypes: [new InstanceType('m5.2xlarge')],
                diskSize: 25,
                nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT }
            },
            {
                id: "mng3",
                amiType: NodegroupAmiType.AL2_X86_64,
                instanceTypes: [new InstanceType('m5.2xlarge')],
                diskSize: 25,
                nodeGroupSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT }
            },
        ]
    });
    
    const istioControlPlaneAddOnProps = {
      values: {
        pilot: {
          autoscaleEnabled: true,
          autoscaleMin: 1,
          autoscaleMax: 5,
          replicaCount: 1,
          rollingMaxSurge: "100%",
          rollingMaxUnavailable: "25%",
          resources: {
            requests: {
              cpu: "500m",
              memory: "2048Mi",
            }
          }
        }
      }
    }      
    
    const account = props?.env?.account!;
    const region = props?.env?.region!;
    const addOns: Array<blueprints.ClusterAddOn> = [
        new blueprints.CalicoOperatorAddOn(),
        new blueprints.MetricsServerAddOn(),
        new blueprints.ContainerInsightsAddOn(),
        new blueprints.AwsLoadBalancerControllerAddOn(),
        new blueprints.SecretsStoreAddOn(),
        new blueprints.KedaAddOn(),
        new blueprints.XrayAddOn(),
        new blueprints.AwsForFluentBitAddOn(),
        new blueprints.EbsCsiDriverAddOn(),
        new blueprints.EfsCsiDriverAddOn({replicaCount: 1}),
        new IstioBaseAddOn(),
        new IstioControlPlaneAddOn(istioControlPlaneAddOnProps)
    ];
    const blueprint = blueprints.EksBlueprint.builder()
    .account(account)
    .region(region)
    .addOns(...addOns)
    .clusterProvider(clusterProvider)
    .teams(new TeamPlatform(account), new TeamApplication('backend',account));
    // HERE WE ADD THE ARGOCD APP OF APPS REPO INFORMATION
    const repoUrl = 'https://github.com/codemato/eks-argo-workloads.git';

    const bootstrapRepo : blueprints.ApplicationRepository = {
        repoUrl,
        targetRevision: 'main',
    }

    // HERE WE GENERATE THE ADDON CONFIGURATIONS
    const devBootstrapArgo = new blueprints.ArgoCDAddOn({
        bootstrapRepo: {
            ...bootstrapRepo,
            path: 'envs/dev'
        },
    });
    const testBootstrapArgo = new blueprints.ArgoCDAddOn({
        bootstrapRepo: {
            ...bootstrapRepo,
            path: 'envs/test'
        },
    });
    const prodBootstrapArgo = new blueprints.ArgoCDAddOn({
        bootstrapRepo: {
            ...bootstrapRepo,
            path: 'envs/prod'
        },
    });
    
    blueprints.CodePipelineStack.builder()
      .name("eks-blueprints-accelerator-pipeline")
      .owner("codemato")
      .repository({
          repoUrl: 'accelerator-eks-blueprint',
          credentialsSecretName: 'accelerator-github-token',
          targetRevision: 'main'
      })
      // WE ADD THE STAGES IN WAVE FROM THE PREVIOUS CODE
      .wave({
        id: "envs",
        stages: [
          { id: "dev", stackBuilder: blueprint.clone('ap-south-1').addOns(devBootstrapArgo)}, // HERE WE ADD OUR NEW ADDON WITH THE CONFIGURED ARGO CONFIGURATION
          { id: "test", stackBuilder: blueprint.clone('ap-southeast-1').addOns(testBootstrapArgo)}, // HERE WE ADD OUR NEW ADDON WITH THE CONFIGURED ARGO CONFIGURATION
          { id: "prod", stackBuilder: blueprint.clone('ap-southeast-2').addOns(prodBootstrapArgo)} // HERE WE ADD OUR NEW ADDON WITH THE CONFIGURED ARGO CONFIGURATION
        ] 
      })
      .build(scope, id+'-stack', props);
  }
}
