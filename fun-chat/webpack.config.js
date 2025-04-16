const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    stats: 'verbose',
    mode: 'development',
    entry: './src/index.ts',
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
        extensions: ['.ts', '.js'],
        fallback: {
            "events": require.resolve("events/"),
            // "buffer": require.resolve("buffer/"),
            // "stream": require.resolve("stream-browserify"),
            // "crypto": require.resolve("crypto-browserify")
        }
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
            },
            {
                test: /\.ts$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        compilerOptions: {
                            composite: false,
                            declaration: false,
                            declarationMap: false,
                            emitDeclarationOnly: false,
                        },
                    },
                },
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
            inject: 'body',
        })
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        compress: true,
        port: 9000,
    },
};
