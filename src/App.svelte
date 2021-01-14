<script>
    import { writable } from "svelte/store";

import Greeting from "./Greeting.svelte";
import Form from "./Form.svelte";
import { Tabs, Tab, TabList, TabPanel } from 'svelte-tabs';
    const name = writable("Charles Brown");

</script>

<h1>Hello world!</h1>

<Form { name }/>

<Greeting { name }/>

<Tabs>
    <TabList>
        <Tab>One</Tab>
        <Tab>Two</Tab>
        <Tab>Three</Tab>
    </TabList>

    <TabPanel>
        <h2>Panel One</h2>
    </TabPanel>

    <TabPanel>
        <h2>Panel Two</h2>
    </TabPanel>

    <TabPanel>
        <h2>Panel Three</h2>
    </TabPanel>
</Tabs>

<style>
    main {
        text-align: center;
        padding: 1em;
        max-width: 240px;
        margin: 0 auto;
    }

    h1 {
        color: #ff3e00;
        text-transform: uppercase;
        font-size: 4em;
        font-weight: 100;
    }

    @media (min-width: 640px) {
        main {
            max-width: none;
        }
    }
</style>