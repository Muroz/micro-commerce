import { defineConfig } from "@rspack/cli";
import { rspack } from "@rspack/core";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { dynamicRemote } from "@mfe/rspack-shared";

/**
 * Bake a "last known good" remote URL map into the shell at build time.
 * If the manifest service is unreachable at runtime, manifestLoader falls
 * back to this. Source priority:
 *   1. MFE_FALLBACK_MANIFEST env var (raw JSON of the remotes object — set
 *      by CI from the current manifest/{env}.json before the shell builds)
 *   2. manifest/prod.json at repo root (production builds only)
 *   3. {} — for dev builds and any failure path. Empty makes
 *      dynamicRemote() use the localhost dev port.
 */
function loadFallbackManifest(isProduction: boolean): Record<string, string> {
  const env = process.env.MFE_FALLBACK_MANIFEST;
  if (env) {
    try {
      return JSON.parse(env);
    } catch (e) {
      console.warn("MFE_FALLBACK_MANIFEST invalid JSON, ignoring", e);
    }
  }
  if (!isProduction) return {};
  try {
    const path = resolve(__dirname, "../../manifest/prod.json");
    const json = JSON.parse(readFileSync(path, "utf8"));
    return json.remotes || {};
  } catch {
    return {};
  }
}

export default defineConfig({
  entry: "./src/index.tsx",
  output: {
    publicPath: "auto",
    uniqueName: "shell",
  },
  devServer: {
    port: 3000,
    hot: true,
    historyApiFallback: true,
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "builtin:swc-loader",
          options: {
            jsc: {
              parser: { syntax: "typescript", tsx: true },
              transform: { react: { runtime: "automatic" } },
            },
          },
        },
        type: "javascript/auto",
      },
      {
        test: /\.css$/,
        type: "css",
      },
    ],
  },
  plugins: [
    new rspack.container.ModuleFederationPlugin({
      name: "shell",
      remotes: {
        products: dynamicRemote("products"),
        cart: dynamicRemote("cart"),
        checkout: dynamicRemote("checkout"),
      },
      shared: {
        react: { singleton: true, eager: false },
        "react-dom": { singleton: true, eager: false },
        "react-router-dom": { singleton: true, eager: false },
        "@mfe/event-bus": { singleton: true, eager: false, requiredVersion: false },
        zustand: { singleton: true, eager: false },
      },
    }),
    new rspack.DefinePlugin({
      __MFE_FALLBACK_MANIFEST__: JSON.stringify(
        loadFallbackManifest(process.env.NODE_ENV === "production"),
      ),
    }),
    new rspack.HtmlRspackPlugin({
      template: "./src/index.html",
    }),
  ],
});
