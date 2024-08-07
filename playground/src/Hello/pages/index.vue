<template>


    <div>
        <HelloTest />
        <h1>Hello World</h1>
        <p>My name is {{ name }}</p>
        <input v-model="name" placeholder="Enter your name" />
    </div>
</template>


<script setup lang="ts">
const name = ref('John Doe');
</script>