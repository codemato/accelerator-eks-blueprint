import { HelmAddOn, HelmAddOnUserProps } from "@aws-quickstart/eks-blueprints/dist/addons/helm-addon";
import { Construct } from "constructs";
import { ClusterInfo, Values } from "@aws-quickstart/eks-blueprints/dist/spi";
import { createNamespace } from "@aws-quickstart/eks-blueprints/dist/utils/namespace-utils";
import merge from "ts-deepmerge";

/**
 * Configuration options for the add-on.
 */
export interface IstioBaseAddOnProps extends HelmAddOnUserProps {
    /**
    * Enable istioctl analysis which provides rich analysis of Istio configuration state in order to identity invalid or suboptimal configurations.
    * @default false
    */
    enableAnalysis?: boolean;

    /**
    *  Enable the istio base config validation.
    * @default true
    */
    configValidation?: boolean;

    /**
    *  If this is set to true, one Istiod will control remote clusters including CA.
    * @default false
    */
    externalIstiod?: boolean;

    /**
    * The address or hostname of the remote pilot
    * @default null
    */
    remotePilotAddress?: string;

    /**
    * Validation webhook configuration url
    * For example: https://$remotePilotAddress:15017/validate
    * @default null
    */
    validationURL?: string;

    /**
    * For istioctl usage to disable istio config crds in base.
    * @default true
    */
    enableIstioConfigCRDs?: boolean;
}

/**
 * Defaults options for the add-on
 */
const defaultProps = {
    name: "base",
    release: "istio-base",
    namespace: "istio-system",
    chart: "base",
    version: "1.13.3",
    repository: "https://istio-release.storage.googleapis.com/charts"
};

export class IstioBaseAddOn extends HelmAddOn {

    readonly options: IstioBaseAddOnProps;

    constructor(props?: IstioBaseAddOnProps) {
        super({ ...defaultProps, ...props });
        this.options = this.props;
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {

        const cluster = clusterInfo.cluster;

        // Istio Namespace
        createNamespace('istio-system', cluster);

        let values: Values = {
            global: {
                istiod: {
                    enableAnalysis: this.options.enableAnalysis
                },
                configValidation: this.options.configValidation,
                externalIstiod: this.options.externalIstiod,
                base: {
                    enableIstioConfigCRDs: this.options.enableIstioConfigCRDs
                }
            }
        };

        values = merge(values, this.props.values ?? {});
        const chart = this.addHelmChart(clusterInfo, values);
        return Promise.resolve(chart);
    }
}
