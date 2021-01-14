<script>
    export let name;
</script>

<form>
    <label for="name-selector">Enter Name:</label>
    <input bind:value={$name}/>
</form>
