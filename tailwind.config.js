/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/**/*.{js,jsx,ts,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: '#4A7C28',
                'primary-light': '#7ED44A',
                coffee: '#F5A623',
            },
        },
    },
    plugins: [],
};
