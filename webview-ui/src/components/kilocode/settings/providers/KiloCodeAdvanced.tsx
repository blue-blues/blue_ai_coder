import { ExternalLinkIcon } from "@radix-ui/react-icons"
import { type ProviderSettings } from "@blues-code/types"
import type { RouterModels } from "@blues/api"
import { useAppTranslation } from "@src/i18n/TranslationContext"
import {
	useOpenRouterModelProviders,
	OPENROUTER_DEFAULT_PROVIDER_NAME,
} from "@src/components/ui/hooks/useOpenRouterModelProviders"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@src/components/ui"
import { useEffect } from "react"

type KiloCodeAdvancedProps = {
	apiConfiguration: ProviderSettings
	setApiConfigurationField: (field: keyof ProviderSettings, value: ProviderSettings[keyof ProviderSettings]) => void
	routerModels?: RouterModels
}

export const KiloCodeAdvanced = ({
	apiConfiguration,
	setApiConfigurationField,
	routerModels,
}: KiloCodeAdvancedProps) => {
	const { t } = useAppTranslation()
	const { data: openRouterModelProviders } = useOpenRouterModelProviders(
		apiConfiguration?.bluesCodeModel,
		undefined,
		undefined,
		{
			enabled:
				!!apiConfiguration?.bluesCodeModel &&
				routerModels?.openrouter &&
				Object.keys(routerModels.openrouter).length > 1 &&
				apiConfiguration.bluesCodeModel in routerModels.openrouter,
		},
	)

	useEffect(() => {
		if (apiConfiguration?.openRouterSpecificProvider === undefined) {
			return
		}
		if (
			(openRouterModelProviders === undefined &&
				apiConfiguration?.openRouterSpecificProvider !== OPENROUTER_DEFAULT_PROVIDER_NAME) ||
			!Object.keys(openRouterModelProviders || {}).includes(apiConfiguration?.openRouterSpecificProvider)
		) {
			setApiConfigurationField("openRouterSpecificProvider", OPENROUTER_DEFAULT_PROVIDER_NAME)
			return
		}
	}, [setApiConfigurationField, openRouterModelProviders, apiConfiguration?.openRouterSpecificProvider])

	return (
		<>
			{openRouterModelProviders && Object.keys(openRouterModelProviders).length > 0 && (
				<div>
					<div className="flex items-center gap-1">
						<label className="block font-medium mb-1">
							{t("bluescode:settings.provider.providerRouting.title")}
						</label>
						<a href={`https://openrouter.ai/${apiConfiguration?.bluesCodeModel}/providers`}>
							<ExternalLinkIcon className="w-4 h-4" />
						</a>
					</div>
					<Select
						value={apiConfiguration?.openRouterSpecificProvider || OPENROUTER_DEFAULT_PROVIDER_NAME}
						onValueChange={(value) => setApiConfigurationField("openRouterSpecificProvider", value)}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder={t("settings:common.select")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={OPENROUTER_DEFAULT_PROVIDER_NAME}>
								{OPENROUTER_DEFAULT_PROVIDER_NAME}
							</SelectItem>
							{Object.entries(openRouterModelProviders).map(([value, { label }]) => (
								<SelectItem key={value} value={value}>
									{label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<div className="text-sm text-vscode-descriptionForeground mt-1">
						{t("bluescode:settings.provider.providerRouting.description")}
					</div>
				</div>
			)}
		</>
	)
}
