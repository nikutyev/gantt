const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
   entry: path.resolve(__dirname, "src", "index.js"),
   output: {
      path : path.resolve(__dirname, "build"),
      filename : "gantt.js",
   },
   module: {
      rules: [
         {
            test: /\.js$/,
            include: path.resolve(__dirname, "src"),
            use: {
               loader: "babel-loader"
            }
         },
         {
            test: /\.css$/i,
            use: ['style-loader', 'css-loader']
         }
      ]
   },
   plugins: [
      new HtmlWebpackPlugin({template: path.resolve(__dirname, "src", "index.html")}),
   ],
};
