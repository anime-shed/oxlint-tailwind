/**
 * Test fixtures for Tailwind CSS classes
 */

export const validTailwindClasses = [
  'flex',
  'items-center',
  'justify-between',
  'p-4',
  'mt-6',
  'mb-2',
  'w-full',
  'h-12',
  'text-sm',
  'text-blue-500',
  'bg-gray-100',
  'font-medium',
  'leading-relaxed',
  'tracking-wide',
  'border-gray-300',
  'rounded-lg',
  'shadow-md',
  'hover:bg-blue-600',
  'focus:outline-none',
  'disabled:opacity-50'
];

export const conflictingClasses = {
  spacing: [
    ['mt-4', 'mt-6'],
    ['p-2', 'p-4'],
    ['mb-0', 'mb-2'],
    ['mx-4', 'mx-8']
  ],
  sizing: [
    ['w-full', 'w-auto'],
    ['h-8', 'h-12'],
    ['max-w-full', 'max-w-screen']
  ],
  typography: [
    ['text-sm', 'text-lg'],
    ['font-normal', 'font-bold'],
    ['leading-tight', 'leading-relaxed']
  ],
  color: [
    ['text-blue-500', 'text-red-500'],
    ['bg-gray-100', 'bg-blue-100'],
    ['border-gray-300', 'border-red-300']
  ],
  layout: [
    ['flex-row', 'flex-col'],
    ['block', 'flex'],
    ['static', 'relative']
  ]
};

export const nonCanonicalClasses = {
  typography: [
    { original: 'text-regular', canonical: 'text-base' },
    { original: 'font-regular', canonical: 'font-normal' },
    { original: 'weight-normal', canonical: 'font-normal' }
  ],
  spacing: [
    { original: 'margin-0', canonical: 'm-0' },
    { original: 'margin-1', canonical: 'm-1' },
    { original: 'padding-0', canonical: 'p-0' }
  ],
  layout: [
    { original: 'display-flex', canonical: 'flex' },
    { original: 'display-block', canonical: 'block' },
    { original: 'display-none', canonical: 'hidden' }
  ],
  sizing: [
    { original: 'width-full', canonical: 'w-full' },
    { original: 'height-full', canonical: 'h-full' },
    { original: 'width-auto', canonical: 'w-auto' }
  ],
  color: [
    { original: 'text-grey', canonical: 'text-gray-500' },
    { original: 'bg-grey', canonical: 'bg-gray-500' },
    { original: 'border-grey', canonical: 'border-gray-500' }
  ]
};

export const sampleVueFile = `
<template>
  <div class="flex items-center justify-between p-4 bg-blue-500 text-white">
    <h1 class="text-2xl font-bold">{{ title }}</h1>
    <p class="text-sm text-gray-600">{{ description }}</p>
  </div>
</template>

<script>
export default {
  name: 'HeaderComponent',
  props: {
    title: String,
    description: String
  }
}
</script>

<style scoped>
.header {
  @apply shadow-md rounded-lg;
}
</style>
`;

export const sampleCssFile = `
.custom-button {
  @apply px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700;
}

.card {
  @apply p-6 bg-white shadow-lg rounded-xl;
}

@media (min-width: 768px) {
  .responsive-text {
    @apply text-lg leading-relaxed;
  }
}
`;

export const sampleHtmlFile = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tailwind CSS Test</title>
</head>
<body class="bg-gray-50 text-gray-900">
  <header class="bg-white shadow-sm">
    <nav class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-blue-600">Logo</h1>
        <ul class="flex space-x-6">
          <li><a href="#" class="text-gray-600 hover:text-blue-600">Home</a></li>
          <li><a href="#" class="text-gray-600 hover:text-blue-600">About</a></li>
          <li><a href="#" class="text-gray-600 hover:text-blue-600">Contact</a></li>
        </ul>
      </div>
    </nav>
  </header>
  
  <main class="container mx-auto px-4 py-8">
    <section class="mb-12">
      <h2 class="text-3xl font-bold mb-4">Welcome</h2>
      <p class="text-lg text-gray-600 leading-relaxed">
        This is a test HTML file with Tailwind CSS classes.
      </p>
    </section>
  </main>
</body>
</html>
`;

export const sampleJsxFile = `
import React from 'react';

const Button = ({ children, variant = 'primary', size = 'medium' }) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };
  
  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg'
  };
  
  return (
    <button
      className={\`\${baseClasses} \${variantClasses[variant]} \${sizeClasses[size]}\`}
    >
      {children}
    </button>
  );
};

export default Button;
`;

export const conflictingClassExamples = [
  'mt-4 mt-6 p-2 p-4 text-blue-500 text-red-500',
  'w-full w-auto h-8 h-12 block flex',
  'text-sm text-lg font-normal font-bold static relative',
  'flex-row flex-col items-start items-center justify-start justify-center'
];

export const nonCanonicalClassExamples = [
  'text-regular font-regular margin-0 padding-0',
  'display-flex display-block text-grey bg-grey',
  'width-full height-full width-auto height-auto'
];