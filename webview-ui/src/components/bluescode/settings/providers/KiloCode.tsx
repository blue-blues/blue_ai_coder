import { useCallback } from "react"
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { getBluesCodeBackendSignInUrl } from "../../helpers"
import { Button } from "@src/components/ui"
import { type ProviderSettings, type OrganizationAllowList, bluesCodeDefaultModelId } from "@roo-code/types"
import type { RouterModels } from "@roo/api"
import { useAppTranslation } from "@src/i18n/TranslationContext"
import { VSCodeButtonLink } from "@src/components/common/VSCodeButtonLink"
import { inputEventTransform } from "../../../settings/transforms"
import { ModelPicker } from "../../../settings/ModelPicker"
import { vscode } from "@src/utils/vscode"

type KiloCodeProps = {
	apiConfiguration: ProviderSettings
	setApiConfigurationField: (field: keyof ProviderSettings, value: ProviderSettings[keyof ProviderSettings]) => void
	currentApiConfigName?: string
	hideBluesCodeButton?: boolean
	routerModels?: RouterModels
	organizationAllowList: OrganizationAllowList
	uriScheme: string | undefined
	uiKind: string | undefined
}

export const KiloCode = ({
	apiConfiguration,
	setApiConfigurationField,
	currentApiConfigName,
	hideBluesCodeButton,
	routerModels,
	organizationAllowList,
	uriScheme,
	uiKind,
}: KiloCodeProps) => {
	const { t } = useAppTranslation()

	const handleInputChange = useCallback(
		<K extends keyof ProviderSettings, E>(
			field: K,
			transform: (event: E) => ProviderSettings[K] = inputEventTransform,
		) =>
			(event: E | Event) => {
				setApiConfigurationField(field, transform(event as E))
			},
		[setApiConfigurationField],
	)

	return (
		<>
			<div style={{ marginTop: "0px" }} className="text-sm text-vscode-descriptionForeground -mt-2">
				You get $20 for free!
			</div>
			<div>
				<label className="block font-medium -mb-2">{t("bluescode:settings.provider.account")}</label>
			</div>
			{!hideBluesCodeButton &&
				(apiConfiguration.bluesCodeToken ? (
					<div>
						<Button
							variant="secondary"
							onClick={async () => {
								setApiConfigurationField("bluesCodeToken", "")

								vscode.postMessage({
									type: "upsertApiConfiguration",
									text: currentApiConfigName,
									apiConfiguration: {
										...apiConfiguration,
										bluesCodeToken: "",
									},
								})
							}}>
							{t("bluescode:settings.provider.logout")}
						</Button>
					</div>
				) : (
					<VSCodeButtonLink variant="secondary" href={getBluesCodeBackendSignInUrl(uriScheme, uiKind)}>
						{t("bluescode:settings.provider.login")}
					</VSCodeButtonLink>
				))}

			<VSCodeTextField
				value={apiConfiguration?.bluesCodeToken || ""}
				type="password"
				onInput={handleInputChange("bluesCodeToken")}
				placeholder={t("bluescode:settings.provider.apiKey")}
				className="w-full">
				<div className="flex justify-between items-center mb-1">
					<label className="block font-medium">{t("bluescode:settings.provider.apiKey")}</label>
				</div>
			</VSCodeTextField>

			<ModelPicker
				apiConfiguration={apiConfiguration}
				setApiConfigurationField={setApiConfigurationField}
				defaultModelId={bluesCodeDefaultModelId}
				models={routerModels?.["bluescode-openrouter"] ?? {}}
				modelIdKey="bluesCodeModel"
				serviceName="Blues Code"
				serviceUrl="https://bluescode.ai"
				organizationAllowList={organizationAllowList}
			/>
		</>
	)
}
