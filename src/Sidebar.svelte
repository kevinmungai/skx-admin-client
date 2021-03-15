<script>
	import { fly } from 'svelte/transition';
	import About from './About.svelte';
	import Contact from './Contact.svelte';

	export let menuitems_show = false;
	let about_modal_show = false; 
	let contact_modal_show = false; 

</script>

{#if menuitems_show}
	<aside class="absolute w-full h-full bg-gray-200 border-r-2 shadow-lg" class:menuitems_show>
		<nav class="p-12 text-xl">
			<button on:click={() => {about_modal_show = true; contact_modal_show = false; menuitems_show = false;}}>About</button>
			<br>
			<button on:click={() => {contact_modal_show = true; about_modal_show = false; menuitems_show = false;}}>Contact</button>

			<!-- <a class="block" href="#about">About</a>
			<a class="block" href="#contact">Contact</a> -->
		</nav>
	</aside>
{/if}

<About bind:about_page_show={about_modal_show} />
<Contact bind:contact_page_show={contact_modal_show} />

<style>
	aside {
		left: -100%;
		transition: left 0.3s ease-in-out
	}
	.menuitems_show{
		left: 0
	}
</style>