module.exports = {
	presets: ['babel-preset-expo'],
	plugins: [
		[
			'module-resolver',
			{
				alias: {
					src: './src',
					'@assets': './src/assets',
					'@components': './src/components',
					'@constants': './src/constants',
					'@screens': './src/screens',
					'@services': './src/services',
					'@theme': './src/theme',
					'@utils': './src/utils',
				},
			},
		],
	],
};