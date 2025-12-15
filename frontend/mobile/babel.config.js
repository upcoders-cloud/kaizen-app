module.exports = {
	presets: ['babel-preset-expo'],
	plugins: [
		[
			'module-resolver',
			{
				alias: {
					src: './src',
					assets: './src/assets',
					components: './src/components',
					constants: './src/constants',
					server: './src/server',
					store: './src/store',
					theme: './src/theme',
					utils: './src/utils',
				},
			},
		],
	],
};
