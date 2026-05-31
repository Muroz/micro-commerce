import { defineConfig } from "@rspack/cli";
import { rspack } from "@rspack/core";

export default defineConfig({
  entry: "./src/index.tsx",
  output: {
    publicPath: "auto",
    uniqueName: "cart",
  },
  devServer: {
    port: 3002,
    hot: true,
    headers: { "Access-Control-Allow-Origin": "*" },
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
      name: "cart",
      filename: "remoteEntry.js",
      exposes: {
        "./CartApp": "./src/App.tsx",
        "./CartBadge": "./src/widgets/CartBadge.tsx",
        "./cartApi": "./src/cartApi.ts",
      },
      shared: {
        react: { singleton: true, eager: false },
        "react-dom": { singleton: true, eager: false },
        "react-router-dom": { singleton: true, eager: false },
        "@mfe/event-bus": { singleton: true, eager: false, requiredVersion: false },
        "@mfe/user-api": { singleton: true, eager: false, requiredVersion: false },
        zustand: { singleton: true, eager: false },
      },
    }),
    new rspack.HtmlRspackPlugin({
      template: "./src/index.html",
    }),
  ],
});
