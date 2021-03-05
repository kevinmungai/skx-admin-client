<script>
	import { fly } from 'svelte/transition';
	import About from './About.svelte';
	import Contact from './Contact.svelte';

	export let page_show = false;
	let about_modal_show = false; 
	let contact_modal_show = false; 

</script>

{#if page_show}
	<aside class="absolute w-full h-full bg-gray-200 border-r-2 shadow-lg" class:page_show>
		<nav class="p-12 text-xl">
			<button on:click={() => {about_modal_show = true; page_show = false;}}>About</button>
			<br>
			<button on:click={() => {contact_modal_show = true; page_show = false;}}>Contact</button>

			<!-- <a class="block" href="#about">About</a>
			<a class="block" href="#contact">Contact</a> -->
		</nav>
	</aside>
{/if}

<About bind:page_show={about_modal_show} />
<Contact bind:page_show={contact_modal_show} />

<style>
	aside {
		left: -100%;
		transition: left 0.3s ease-in-out
	}
	.page_show{
		left: 0
	}
</style>