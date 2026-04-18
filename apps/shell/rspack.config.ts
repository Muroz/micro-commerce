import { defineConfig } from "@rspack/cli";
import { rspack } from "@rspack/core";

export default defineConfig({
  entry: "./src/index.tsx",
  output: {
    publicPath: "http://localhost:3000/",
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
        products: "products@http://localhost:3001/remoteEntry.js",
        cart: "cart@http://localhost:3002/remoteEntry.js",
        checkout: "checkout@http://localhost:3003/remoteEntry.js",
      },
      shared: {
        react: { singleton: true, eager: false },
        "react-dom": { singleton: true, eager: false },
        "react-router-dom": { singleton: true, eager: false },
        "@mfe/event-bus": { singleton: true, eager: false, requiredVersion: false },
        "@mfe/cart-api": { singleton: true, eager: false, requiredVersion: false },
        "@mfe/user-api": { singleton: true, eager: false, requiredVersion: false },
        zustand: { singleton: true, eager: false },
      },
    }),
    new rspack.HtmlRspackPlugin({
      template: "./src/index.html",
    }),
  ],
});
