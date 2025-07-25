import { join } from "node:path";
import {
	BuiltinPluginName,
	type RawCssExtractPluginOption
} from "@rspack/binding";
import type { Compiler } from "../..";
import { MODULE_TYPE } from "./loader";
import { PLUGIN_NAME } from "./utils";

export * from "./loader";

const DEFAULT_FILENAME = "[name].css";
const LOADER_PATH = join(__dirname, "cssExtractLoader.js");

export type { CssExtractRspackLoaderOptions } from "./loader";

export interface CssExtractRspackPluginOptions {
	filename?: RawCssExtractPluginOption["filename"];
	chunkFilename?: RawCssExtractPluginOption["chunkFilename"];
	ignoreOrder?: boolean;
	insert?: string | ((linkTag: HTMLLinkElement) => void);
	attributes?: Record<string, string>;
	linkType?: string | "text/css" | false;
	runtime?: boolean;

	// workaround for pathinto, deprecate this when rspack supports pathinfo
	pathinfo?: boolean;
	// when using relativePath, add './' prefix, e.g:  url('static/img/foo.png') => url('./static/img/foo.png')
	enforceRelative?: boolean;
}

export class CssExtractRspackPlugin {
	static pluginName = PLUGIN_NAME;
	static loader: string = LOADER_PATH;

	options: CssExtractRspackPluginOptions;

	constructor(options?: CssExtractRspackPluginOptions) {
		this.options = options || {};
	}

	apply(compiler: Compiler) {
		const { splitChunks } = compiler.options.optimization;

		if (splitChunks) {
			if (
				/** @type {string[]} */ splitChunks.defaultSizeTypes!.includes("...")
			) {
				/** @type {string[]} */
				splitChunks.defaultSizeTypes!.push(MODULE_TYPE);
			}
		}

		if (
			compiler.options.output.pathinfo &&
			this.options.pathinfo === undefined
		) {
			this.options.pathinfo = true;
		}

		compiler.__internal__registerBuiltinPlugin({
			name: BuiltinPluginName.CssExtractRspackPlugin,
			options: this.normalizeOptions(this.options)
		});
	}

	normalizeOptions(
		options: CssExtractRspackPluginOptions
	): RawCssExtractPluginOption {
		let chunkFilename = options.chunkFilename;

		if (!chunkFilename) {
			const filename = options.filename || DEFAULT_FILENAME;

			if (typeof filename !== "function") {
				const hasName = /** @type {string} */ filename.includes("[name]");
				const hasId = /** @type {string} */ filename.includes("[id]");
				const hasChunkHash =
					/** @type {string} */
					filename.includes("[chunkhash]");
				const hasContentHash =
					/** @type {string} */
					filename.includes("[contenthash]");

				// Anything changing depending on chunk is fine
				if (hasChunkHash || hasContentHash || hasName || hasId) {
					chunkFilename = filename;
				} else {
					// Otherwise prefix "[id]." in front of the basename to make it changing
					chunkFilename =
						/** @type {string} */
						filename.replace(/(^|\/)([^/]*(?:\?|$))/, "$1[id].$2");
				}
			} else {
				chunkFilename = "[id].css";
			}
		}

		const normalzedOptions: RawCssExtractPluginOption = {
			filename: options.filename || DEFAULT_FILENAME,
			chunkFilename: chunkFilename!,
			ignoreOrder: options.ignoreOrder ?? false,
			runtime: options.runtime ?? true,
			insert:
				typeof options.insert === "function"
					? options.insert.toString()
					: JSON.stringify(options.insert),
			linkType:
				typeof options.linkType === "undefined"
					? JSON.stringify("text/css")
					: options.linkType === false
						? undefined
						: JSON.stringify(options.linkType),
			attributes: options.attributes
				? (Reflect.ownKeys(options.attributes)
						.map(k => [
							JSON.stringify(k),
							JSON.stringify(options.attributes![k as string])
						])
						.reduce((obj: Record<string, string>, [k, v]) => {
							obj[k] = v;
							return obj;
						}, {}) as Record<string, string>)
				: {},
			pathinfo: options.pathinfo ?? false,
			enforceRelative: options.enforceRelative ?? false
		};

		return normalzedOptions;
	}
}

export default CssExtractRspackPlugin;
