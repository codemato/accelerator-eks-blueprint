import { Construct } from "constructs";
import merge from "ts-deepmerge";
import { ClusterInfo } from "@aws-quickstart/eks-blueprints/dist/spi";
import { HelmAddOn, HelmAddOnUserProps } from "@aws-quickstart/eks-blueprints/dist/addons/helm-addon";
import { dependable } from '@aws-quickstart/eks-blueprints/dist/utils/';
import { ValuesSchema } from "./istio-control-plane-values";

export interface IstioControlPlaneAddOnProps extends HelmAddOnUserProps {
    values?: ValuesSchema
}

const defaultProps = {
    name: "istiod",
    release: "istiod",
    namespace: "istio-system",
    chart: "istiod",
    version: "1.13.3",
    repository: "https://istio-release.storage.googleapis.com/charts"
};

export class IstioControlPlaneAddOn extends HelmAddOn {

    constructor(props?: IstioControlPlaneAddOnProps) {
        super({ ...defaultProps, ...props });
    }

    @dependable('IstioBaseAddOn')
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {

        const cluster = clusterInfo.cluster;

        let values: ValuesSchema = {
            awsRegion: cluster.stack.region,
        };

        values = merge(values, this.props.values ?? {});

        const chart = this.addHelmChart(clusterInfo, values);
        return Promise.resolve(chart);
    }
}