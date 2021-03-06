import { WebpackOption } from './model';
import { Configuration, Rule, loader, Loader } from 'webpack';
import * as path from 'path';
import { CssRawLoader } from './loader/webpack';
import { getHashTypeFormat } from './utils';

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const autoprefix = require('autoprefixer');

export function webpackStyles(wbo: WebpackOption): Configuration {
    const { root, buildConfig } = wbo;
    const entryPoints: { [key: string]: string[] } = {};
    const extraPlugin = [];

    buildConfig.styles.forEach((style) => {
        entryPoints[style.name] = [style.path];
    });
    const common: Rule[] = [baseCssRule(wbo), baseSassRule(wbo), baseStylusRule(wbo)];
    const components: Rule[] = componentRules(wbo, common);
    const globals: Rule[] = globalRules(wbo, common);
    const rules: Rule[] = [...components, ...globals];

    const hashFormat = getHashTypeFormat(buildConfig.outputHash, buildConfig.outputHashLen);

    if (buildConfig.extractCss) {
        extraPlugin.push(new MiniCssExtractPlugin({
            filename: `[name]${hashFormat.asset}.css`
        }));
    }

    return {
        entry: entryPoints,
        module: { rules },
        plugins: [...extraPlugin]
    };
}

function baseCssRule(wbo: WebpackOption): Rule {
    return { test: /\.css$/, use: [] };
}

function baseSassRule(wbo: WebpackOption): Rule {
    return {
        test: /\.scss$/, use: [{
            loader: 'sass-loader',
            options: {
                sourceMap: wbo.buildConfig.sourceMap,
                precision: 8
            }
        }]
    };
}

function baseStylusRule(wbo: WebpackOption): Rule {
    return {
        test: /\.styl$/, use: [
            {
                loader: 'stylus-loader',
                options: {
                    sourceMap: wbo.buildConfig.sourceMap
                }
            }
        ]
    };
}

function componentRules(wbo: WebpackOption, rules: Rule[]): Rule[] {
    return rules.map<Rule>(({ test, use }) => ({
        include: path.resolve(wbo.root, 'app'),
        test,
        use: [
            { loader: 'raw-loader' },
            {
                loader: 'postcss-loader',
                options: {
                    ident: 'embedded',
                    plugins: postcssPlugins,
                    sourceMap: wbo.buildConfig.sourceMap
                }
            },
            ...(use as Loader[])
        ]
    }));
}

function globalRules(wbo: WebpackOption, rules: Rule[]): Rule[] {
    return rules.map<Rule>(({ test, use }) => ({
        exclude: path.resolve(wbo.root, 'app'),
        test,
        use: [
            wbo.buildConfig.extractCss ? MiniCssExtractPlugin.loader : 'style-loader',
            { loader: wbo.buildConfig.extractCss ? CssRawLoader : 'raw-loader' },
            {
                loader: 'postcss-loader',
                options: {
                    ident: wbo.buildConfig.extractCss ? 'extracted' : 'embedded',
                    plugins: postcssPlugins,
                    sourceMap: wbo.buildConfig.sourceMap
                }
            },
            ...(use as Loader[])
        ]
    }));
}

function postcssPlugins(loader: loader.LoaderContext): any[] {
    return [
        autoprefix({ grid: true })
    ];
}
