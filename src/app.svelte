<script>
    import Header from './components/Header.svelte'
    import Footer from './components/Footer.svelte'
    import Navbar from './Navbar.svelte'
    import Sidebar from './Sidebar.svelte'
    import Content from './Content.svelte'

	import About from './About.svelte'
	import Contact from './Contact.svelte'

  // Show admin icon and display menu
  let sidebar_show = false;

</script>

<Header/>
    <Sidebar bind:page_show={sidebar_show }/>
    <Navbar bind:sidebar={sidebar_show}/>
    <Content/>
<Footer/>

<svelte:head>
	<link href="https://unpkg.com/tailwindcss@^1.0/dist/tailwind.min.css" rel="stylesheet"/>
</svelte:head>

<style>
	:global(body) {
		padding: 0;
	}
</style>