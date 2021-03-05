<script>
	import Logo from './Logo.svelte'
	import Drawer from './Drawer.svelte'
	import Menu from './Menu.svelte'
	
	export let sidebar = false
</script>

<header class="flex justify-between bg-gray-200 p-2 items-center text-gray-600 border-b-2">
	<nav class="flex">
		<Drawer bind:show={sidebar}/>
		<Logo/>	
	</nav>
	
	<Menu/>
</header>