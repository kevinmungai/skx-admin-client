function noop() { }
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function is_empty(obj) {
    return Object.keys(obj).length === 0;
}
function subscribe(store, ...callbacks) {
    if (store == null) {
        return noop;
    }
    const unsub = store.subscribe(...callbacks);
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function component_subscribe(component, store, callback) {
    component.$$.on_destroy.push(subscribe(store, callback));
}
function create_slot(definition, ctx, $$scope, fn) {
    if (definition) {
        const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
        return definition[0](slot_ctx);
    }
}
function get_slot_context(definition, ctx, $$scope, fn) {
    return definition[1] && fn
        ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
        : $$scope.ctx;
}
function get_slot_changes(definition, $$scope, dirty, fn) {
    if (definition[2] && fn) {
        const lets = definition[2](fn(dirty));
        if ($$scope.dirty === undefined) {
            return lets;
        }
        if (typeof lets === 'object') {
            const merged = [];
            const len = Math.max($$scope.dirty.length, lets.length);
            for (let i = 0; i < len; i += 1) {
                merged[i] = $$scope.dirty[i] | lets[i];
            }
            return merged;
        }
        return $$scope.dirty | lets;
    }
    return $$scope.dirty;
}
function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
    const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
    if (slot_changes) {
        const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
        slot.p(slot_context, slot_changes);
    }
}

function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.wholeText !== data)
        text.data = data;
}
function set_input_value(input, value) {
    input.value = value == null ? '' : value;
}
function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error('Function called outside component initialization');
    return current_component;
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
function afterUpdate(fn) {
    get_current_component().$$.after_update.push(fn);
}
function onDestroy(fn) {
    get_current_component().$$.on_destroy.push(fn);
}
function setContext(key, context) {
    get_current_component().$$.context.set(key, context);
}
function getContext(key) {
    return get_current_component().$$.context.get(key);
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function tick() {
    schedule_update();
    return resolved_promise;
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
let flushing = false;
const seen_callbacks = new Set();
function flush() {
    if (flushing)
        return;
    flushing = true;
    do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
            const component = dirty_components[i];
            set_current_component(component);
            update(component.$$);
        }
        set_current_component(null);
        dirty_components.length = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
}
function create_component(block) {
    block && block.c();
}
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);
        if (on_destroy) {
            on_destroy.push(...new_on_destroy);
        }
        else {
            // Edge case - component was destroyed immediately,
            // most likely as a result of a binding initialising
            run_all(new_on_destroy);
        }
        component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const prop_values = options.props || {};
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
/**
 * Base class for Svelte components. Used when dev=false.
 */
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set($$props) {
        if (this.$$set && !is_empty($$props)) {
            this.$$.skip_bound = true;
            this.$$set($$props);
            this.$$.skip_bound = false;
        }
    }
}

const subscriber_queue = [];
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable(value, start = noop) {
    let stop;
    const subscribers = [];
    function set(new_value) {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                const run_queue = !subscriber_queue.length;
                for (let i = 0; i < subscribers.length; i += 1) {
                    const s = subscribers[i];
                    s[1]();
                    subscriber_queue.push(s, value);
                }
                if (run_queue) {
                    for (let i = 0; i < subscriber_queue.length; i += 2) {
                        subscriber_queue[i][0](subscriber_queue[i + 1]);
                    }
                    subscriber_queue.length = 0;
                }
            }
        }
    }
    function update(fn) {
        set(fn(value));
    }
    function subscribe(run, invalidate = noop) {
        const subscriber = [run, invalidate];
        subscribers.push(subscriber);
        if (subscribers.length === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            const index = subscribers.indexOf(subscriber);
            if (index !== -1) {
                subscribers.splice(index, 1);
            }
            if (subscribers.length === 0) {
                stop();
                stop = null;
            }
        };
    }
    return { set, update, subscribe };
}

/* src/Greeting.svelte generated by Svelte v3.31.2 */

function create_fragment(ctx) {
	let h2;
	let t0;
	let t1;
	let t2;

	return {
		c() {
			h2 = element("h2");
			t0 = text("Hello ");
			t1 = text(/*$name*/ ctx[1]);
			t2 = text("!");
		},
		m(target, anchor) {
			insert(target, h2, anchor);
			append(h2, t0);
			append(h2, t1);
			append(h2, t2);
		},
		p(ctx, [dirty]) {
			if (dirty & /*$name*/ 2) set_data(t1, /*$name*/ ctx[1]);
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(h2);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let $name,
		$$unsubscribe_name = noop,
		$$subscribe_name = () => ($$unsubscribe_name(), $$unsubscribe_name = subscribe(name, $$value => $$invalidate(1, $name = $$value)), name);

	$$self.$$.on_destroy.push(() => $$unsubscribe_name());
	let { name } = $$props;
	$$subscribe_name();

	$$self.$$set = $$props => {
		if ("name" in $$props) $$subscribe_name($$invalidate(0, name = $$props.name));
	};

	return [name, $name];
}

class Greeting extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, { name: 0 });
	}
}

/* src/Form.svelte generated by Svelte v3.31.2 */

function create_fragment$1(ctx) {
	let form;
	let label;
	let t1;
	let input;
	let mounted;
	let dispose;

	return {
		c() {
			form = element("form");
			label = element("label");
			label.textContent = "Enter Name:";
			t1 = space();
			input = element("input");
			attr(label, "for", "name-selector");
		},
		m(target, anchor) {
			insert(target, form, anchor);
			append(form, label);
			append(form, t1);
			append(form, input);
			set_input_value(input, /*$name*/ ctx[1]);

			if (!mounted) {
				dispose = listen(input, "input", /*input_input_handler*/ ctx[2]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*$name*/ 2 && input.value !== /*$name*/ ctx[1]) {
				set_input_value(input, /*$name*/ ctx[1]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(form);
			mounted = false;
			dispose();
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let $name,
		$$unsubscribe_name = noop,
		$$subscribe_name = () => ($$unsubscribe_name(), $$unsubscribe_name = subscribe(name, $$value => $$invalidate(1, $name = $$value)), name);

	$$self.$$.on_destroy.push(() => $$unsubscribe_name());
	let { name } = $$props;
	$$subscribe_name();

	function input_input_handler() {
		$name = this.value;
		name.set($name);
	}

	$$self.$$set = $$props => {
		if ("name" in $$props) $$subscribe_name($$invalidate(0, name = $$props.name));
	};

	return [name, $name, input_input_handler];
}

class Form extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, { name: 0 });
	}
}

let id = 1;

function getId() {
  return `svelte-tabs-${id++}`;
}

/* node_modules/svelte-tabs/src/Tabs.svelte generated by Svelte v3.31.2 */

function create_fragment$2(ctx) {
	let div;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[4].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

	return {
		c() {
			div = element("div");
			if (default_slot) default_slot.c();
			attr(div, "class", "svelte-tabs");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (default_slot) {
				default_slot.m(div, null);
			}

			current = true;

			if (!mounted) {
				dispose = listen(div, "keydown", /*handleKeyDown*/ ctx[1]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 8) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (default_slot) default_slot.d(detaching);
			mounted = false;
			dispose();
		}
	};
}

const TABS = {};

function removeAndUpdateSelected(arr, item, selectedStore) {
	const index = arr.indexOf(item);
	arr.splice(index, 1);

	selectedStore.update(selected => selected === item
	? arr[index] || arr[arr.length - 1]
	: selected);
}

function instance$2($$self, $$props, $$invalidate) {
	let $selectedTab;
	let { $$slots: slots = {}, $$scope } = $$props;
	let { initialSelectedIndex = 0 } = $$props;
	const tabElements = [];
	const tabs = [];
	const panels = [];
	const controls = writable({});
	const labeledBy = writable({});
	const selectedTab = writable(null);
	component_subscribe($$self, selectedTab, value => $$invalidate(5, $selectedTab = value));
	const selectedPanel = writable(null);

	function registerItem(arr, item, selectedStore) {
		arr.push(item);
		selectedStore.update(selected => selected || item);
		onDestroy(() => removeAndUpdateSelected(arr, item, selectedStore));
	}

	function selectTab(tab) {
		const index = tabs.indexOf(tab);
		selectedTab.set(tab);
		selectedPanel.set(panels[index]);
	}

	setContext(TABS, {
		registerTab(tab) {
			registerItem(tabs, tab, selectedTab);
		},
		registerTabElement(tabElement) {
			tabElements.push(tabElement);
		},
		registerPanel(panel) {
			registerItem(panels, panel, selectedPanel);
		},
		selectTab,
		selectedTab,
		selectedPanel,
		controls,
		labeledBy
	});

	onMount(() => {
		selectTab(tabs[initialSelectedIndex]);
	});

	afterUpdate(() => {
		for (let i = 0; i < tabs.length; i++) {
			controls.update(controlsData => ({
				...controlsData,
				[tabs[i].id]: panels[i].id
			}));

			labeledBy.update(labeledByData => ({
				...labeledByData,
				[panels[i].id]: tabs[i].id
			}));
		}
	});

	async function handleKeyDown(event) {
		if (event.target.classList.contains("svelte-tabs__tab")) {
			let selectedIndex = tabs.indexOf($selectedTab);

			switch (event.key) {
				case "ArrowRight":
					selectedIndex += 1;
					if (selectedIndex > tabs.length - 1) {
						selectedIndex = 0;
					}
					selectTab(tabs[selectedIndex]);
					tabElements[selectedIndex].focus();
					break;
				case "ArrowLeft":
					selectedIndex -= 1;
					if (selectedIndex < 0) {
						selectedIndex = tabs.length - 1;
					}
					selectTab(tabs[selectedIndex]);
					tabElements[selectedIndex].focus();
			}
		}
	}

	$$self.$$set = $$props => {
		if ("initialSelectedIndex" in $$props) $$invalidate(2, initialSelectedIndex = $$props.initialSelectedIndex);
		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
	};

	return [selectedTab, handleKeyDown, initialSelectedIndex, $$scope, slots];
}

class Tabs extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { initialSelectedIndex: 2 });
	}
}

/* node_modules/svelte-tabs/src/Tab.svelte generated by Svelte v3.31.2 */

function add_css() {
	var style = element("style");
	style.id = "svelte-1fbofsd-style";
	style.textContent = ".svelte-tabs__tab.svelte-1fbofsd{border:none;border-bottom:2px solid transparent;color:#000000;cursor:pointer;list-style:none;display:inline-block;padding:0.5em 0.75em}.svelte-tabs__tab.svelte-1fbofsd:focus{outline:thin dotted}.svelte-tabs__selected.svelte-1fbofsd{border-bottom:2px solid #4F81E5;color:#4F81E5}";
	append(document.head, style);
}

function create_fragment$3(ctx) {
	let li;
	let li_aria_controls_value;
	let li_tabindex_value;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[9].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

	return {
		c() {
			li = element("li");
			if (default_slot) default_slot.c();
			attr(li, "role", "tab");
			attr(li, "id", ctx[3].id);
			attr(li, "aria-controls", li_aria_controls_value = /*$controls*/ ctx[2][/*tab*/ ctx[3].id]);
			attr(li, "aria-selected", /*isSelected*/ ctx[1]);
			attr(li, "tabindex", li_tabindex_value = /*isSelected*/ ctx[1] ? 0 : -1);
			attr(li, "class", "svelte-tabs__tab svelte-1fbofsd");
			toggle_class(li, "svelte-tabs__selected", /*isSelected*/ ctx[1]);
		},
		m(target, anchor) {
			insert(target, li, anchor);

			if (default_slot) {
				default_slot.m(li, null);
			}

			/*li_binding*/ ctx[10](li);
			current = true;

			if (!mounted) {
				dispose = listen(li, "click", /*click_handler*/ ctx[11]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 256) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[8], dirty, null, null);
				}
			}

			if (!current || dirty & /*$controls*/ 4 && li_aria_controls_value !== (li_aria_controls_value = /*$controls*/ ctx[2][/*tab*/ ctx[3].id])) {
				attr(li, "aria-controls", li_aria_controls_value);
			}

			if (!current || dirty & /*isSelected*/ 2) {
				attr(li, "aria-selected", /*isSelected*/ ctx[1]);
			}

			if (!current || dirty & /*isSelected*/ 2 && li_tabindex_value !== (li_tabindex_value = /*isSelected*/ ctx[1] ? 0 : -1)) {
				attr(li, "tabindex", li_tabindex_value);
			}

			if (dirty & /*isSelected*/ 2) {
				toggle_class(li, "svelte-tabs__selected", /*isSelected*/ ctx[1]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(li);
			if (default_slot) default_slot.d(detaching);
			/*li_binding*/ ctx[10](null);
			mounted = false;
			dispose();
		}
	};
}

function instance$3($$self, $$props, $$invalidate) {
	let $selectedTab;
	let $controls;
	let { $$slots: slots = {}, $$scope } = $$props;
	let tabEl;
	const tab = { id: getId() };
	const { registerTab, registerTabElement, selectTab, selectedTab, controls } = getContext(TABS);
	component_subscribe($$self, selectedTab, value => $$invalidate(7, $selectedTab = value));
	component_subscribe($$self, controls, value => $$invalidate(2, $controls = value));
	let isSelected;
	registerTab(tab);

	onMount(async () => {
		await tick();
		registerTabElement(tabEl);
	});

	function li_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			tabEl = $$value;
			$$invalidate(0, tabEl);
		});
	}

	const click_handler = () => selectTab(tab);

	$$self.$$set = $$props => {
		if ("$$scope" in $$props) $$invalidate(8, $$scope = $$props.$$scope);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*$selectedTab*/ 128) {
			 $$invalidate(1, isSelected = $selectedTab === tab);
		}
	};

	return [
		tabEl,
		isSelected,
		$controls,
		tab,
		selectTab,
		selectedTab,
		controls,
		$selectedTab,
		$$scope,
		slots,
		li_binding,
		click_handler
	];
}

class Tab extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-1fbofsd-style")) add_css();
		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});
	}
}

/* node_modules/svelte-tabs/src/TabList.svelte generated by Svelte v3.31.2 */

function add_css$1() {
	var style = element("style");
	style.id = "svelte-12yby2a-style";
	style.textContent = ".svelte-tabs__tab-list.svelte-12yby2a{border-bottom:1px solid #CCCCCC;margin:0;padding:0}";
	append(document.head, style);
}

function create_fragment$4(ctx) {
	let ul;
	let current;
	const default_slot_template = /*#slots*/ ctx[1].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

	return {
		c() {
			ul = element("ul");
			if (default_slot) default_slot.c();
			attr(ul, "role", "tablist");
			attr(ul, "class", "svelte-tabs__tab-list svelte-12yby2a");
		},
		m(target, anchor) {
			insert(target, ul, anchor);

			if (default_slot) {
				default_slot.m(ul, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 1) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[0], dirty, null, null);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(ul);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance$4($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;

	$$self.$$set = $$props => {
		if ("$$scope" in $$props) $$invalidate(0, $$scope = $$props.$$scope);
	};

	return [$$scope, slots];
}

class TabList extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-12yby2a-style")) add_css$1();
		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});
	}
}

/* node_modules/svelte-tabs/src/TabPanel.svelte generated by Svelte v3.31.2 */

function add_css$2() {
	var style = element("style");
	style.id = "svelte-epfyet-style";
	style.textContent = ".svelte-tabs__tab-panel.svelte-epfyet{margin-top:0.5em}";
	append(document.head, style);
}

// (26:2) {#if $selectedPanel === panel}
function create_if_block(ctx) {
	let current;
	const default_slot_template = /*#slots*/ ctx[6].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

	return {
		c() {
			if (default_slot) default_slot.c();
		},
		m(target, anchor) {
			if (default_slot) {
				default_slot.m(target, anchor);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 32) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[5], dirty, null, null);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function create_fragment$5(ctx) {
	let div;
	let div_aria_labelledby_value;
	let current;
	let if_block = /*$selectedPanel*/ ctx[1] === /*panel*/ ctx[2] && create_if_block(ctx);

	return {
		c() {
			div = element("div");
			if (if_block) if_block.c();
			attr(div, "id", ctx[2].id);
			attr(div, "aria-labelledby", div_aria_labelledby_value = /*$labeledBy*/ ctx[0][/*panel*/ ctx[2].id]);
			attr(div, "class", "svelte-tabs__tab-panel svelte-epfyet");
			attr(div, "role", "tabpanel");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if (if_block) if_block.m(div, null);
			current = true;
		},
		p(ctx, [dirty]) {
			if (/*$selectedPanel*/ ctx[1] === /*panel*/ ctx[2]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*$selectedPanel*/ 2) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(div, null);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}

			if (!current || dirty & /*$labeledBy*/ 1 && div_aria_labelledby_value !== (div_aria_labelledby_value = /*$labeledBy*/ ctx[0][/*panel*/ ctx[2].id])) {
				attr(div, "aria-labelledby", div_aria_labelledby_value);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (if_block) if_block.d();
		}
	};
}

function instance$5($$self, $$props, $$invalidate) {
	let $labeledBy;
	let $selectedPanel;
	let { $$slots: slots = {}, $$scope } = $$props;
	const panel = { id: getId() };
	const { registerPanel, selectedPanel, labeledBy } = getContext(TABS);
	component_subscribe($$self, selectedPanel, value => $$invalidate(1, $selectedPanel = value));
	component_subscribe($$self, labeledBy, value => $$invalidate(0, $labeledBy = value));
	registerPanel(panel);

	$$self.$$set = $$props => {
		if ("$$scope" in $$props) $$invalidate(5, $$scope = $$props.$$scope);
	};

	return [$labeledBy, $selectedPanel, panel, selectedPanel, labeledBy, $$scope, slots];
}

class TabPanel extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-epfyet-style")) add_css$2();
		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});
	}
}

/* src/App.svelte generated by Svelte v3.31.2 */

function add_css$3() {
	var style = element("style");
	style.id = "svelte-u9qvfs-style";
	style.textContent = "h1.svelte-u9qvfs{color:#ff3e00;text-transform:uppercase;font-size:4em;font-weight:100}@media(min-width: 640px){}";
	append(document.head, style);
}

// (19:8) <Tab>
function create_default_slot_7(ctx) {
	let t;

	return {
		c() {
			t = text("One");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (20:8) <Tab>
function create_default_slot_6(ctx) {
	let t;

	return {
		c() {
			t = text("Two");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (21:8) <Tab>
function create_default_slot_5(ctx) {
	let t;

	return {
		c() {
			t = text("Three");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (18:4) <TabList>
function create_default_slot_4(ctx) {
	let tab0;
	let t0;
	let tab1;
	let t1;
	let tab2;
	let current;

	tab0 = new Tab({
			props: {
				$$slots: { default: [create_default_slot_7] },
				$$scope: { ctx }
			}
		});

	tab1 = new Tab({
			props: {
				$$slots: { default: [create_default_slot_6] },
				$$scope: { ctx }
			}
		});

	tab2 = new Tab({
			props: {
				$$slots: { default: [create_default_slot_5] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(tab0.$$.fragment);
			t0 = space();
			create_component(tab1.$$.fragment);
			t1 = space();
			create_component(tab2.$$.fragment);
		},
		m(target, anchor) {
			mount_component(tab0, target, anchor);
			insert(target, t0, anchor);
			mount_component(tab1, target, anchor);
			insert(target, t1, anchor);
			mount_component(tab2, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const tab0_changes = {};

			if (dirty & /*$$scope*/ 2) {
				tab0_changes.$$scope = { dirty, ctx };
			}

			tab0.$set(tab0_changes);
			const tab1_changes = {};

			if (dirty & /*$$scope*/ 2) {
				tab1_changes.$$scope = { dirty, ctx };
			}

			tab1.$set(tab1_changes);
			const tab2_changes = {};

			if (dirty & /*$$scope*/ 2) {
				tab2_changes.$$scope = { dirty, ctx };
			}

			tab2.$set(tab2_changes);
		},
		i(local) {
			if (current) return;
			transition_in(tab0.$$.fragment, local);
			transition_in(tab1.$$.fragment, local);
			transition_in(tab2.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(tab0.$$.fragment, local);
			transition_out(tab1.$$.fragment, local);
			transition_out(tab2.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(tab0, detaching);
			if (detaching) detach(t0);
			destroy_component(tab1, detaching);
			if (detaching) detach(t1);
			destroy_component(tab2, detaching);
		}
	};
}

// (24:4) <TabPanel>
function create_default_slot_3(ctx) {
	let h2;

	return {
		c() {
			h2 = element("h2");
			h2.textContent = "Panel One";
		},
		m(target, anchor) {
			insert(target, h2, anchor);
		},
		d(detaching) {
			if (detaching) detach(h2);
		}
	};
}

// (28:4) <TabPanel>
function create_default_slot_2(ctx) {
	let h2;

	return {
		c() {
			h2 = element("h2");
			h2.textContent = "Panel Two";
		},
		m(target, anchor) {
			insert(target, h2, anchor);
		},
		d(detaching) {
			if (detaching) detach(h2);
		}
	};
}

// (32:4) <TabPanel>
function create_default_slot_1(ctx) {
	let h2;

	return {
		c() {
			h2 = element("h2");
			h2.textContent = "Panel Three";
		},
		m(target, anchor) {
			insert(target, h2, anchor);
		},
		d(detaching) {
			if (detaching) detach(h2);
		}
	};
}

// (17:0) <Tabs>
function create_default_slot(ctx) {
	let tablist;
	let t0;
	let tabpanel0;
	let t1;
	let tabpanel1;
	let t2;
	let tabpanel2;
	let current;

	tablist = new TabList({
			props: {
				$$slots: { default: [create_default_slot_4] },
				$$scope: { ctx }
			}
		});

	tabpanel0 = new TabPanel({
			props: {
				$$slots: { default: [create_default_slot_3] },
				$$scope: { ctx }
			}
		});

	tabpanel1 = new TabPanel({
			props: {
				$$slots: { default: [create_default_slot_2] },
				$$scope: { ctx }
			}
		});

	tabpanel2 = new TabPanel({
			props: {
				$$slots: { default: [create_default_slot_1] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			create_component(tablist.$$.fragment);
			t0 = space();
			create_component(tabpanel0.$$.fragment);
			t1 = space();
			create_component(tabpanel1.$$.fragment);
			t2 = space();
			create_component(tabpanel2.$$.fragment);
		},
		m(target, anchor) {
			mount_component(tablist, target, anchor);
			insert(target, t0, anchor);
			mount_component(tabpanel0, target, anchor);
			insert(target, t1, anchor);
			mount_component(tabpanel1, target, anchor);
			insert(target, t2, anchor);
			mount_component(tabpanel2, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const tablist_changes = {};

			if (dirty & /*$$scope*/ 2) {
				tablist_changes.$$scope = { dirty, ctx };
			}

			tablist.$set(tablist_changes);
			const tabpanel0_changes = {};

			if (dirty & /*$$scope*/ 2) {
				tabpanel0_changes.$$scope = { dirty, ctx };
			}

			tabpanel0.$set(tabpanel0_changes);
			const tabpanel1_changes = {};

			if (dirty & /*$$scope*/ 2) {
				tabpanel1_changes.$$scope = { dirty, ctx };
			}

			tabpanel1.$set(tabpanel1_changes);
			const tabpanel2_changes = {};

			if (dirty & /*$$scope*/ 2) {
				tabpanel2_changes.$$scope = { dirty, ctx };
			}

			tabpanel2.$set(tabpanel2_changes);
		},
		i(local) {
			if (current) return;
			transition_in(tablist.$$.fragment, local);
			transition_in(tabpanel0.$$.fragment, local);
			transition_in(tabpanel1.$$.fragment, local);
			transition_in(tabpanel2.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(tablist.$$.fragment, local);
			transition_out(tabpanel0.$$.fragment, local);
			transition_out(tabpanel1.$$.fragment, local);
			transition_out(tabpanel2.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(tablist, detaching);
			if (detaching) detach(t0);
			destroy_component(tabpanel0, detaching);
			if (detaching) detach(t1);
			destroy_component(tabpanel1, detaching);
			if (detaching) detach(t2);
			destroy_component(tabpanel2, detaching);
		}
	};
}

function create_fragment$6(ctx) {
	let h1;
	let t1;
	let form;
	let t2;
	let greeting;
	let t3;
	let tabs;
	let current;
	form = new Form({ props: { name: /*name*/ ctx[0] } });
	greeting = new Greeting({ props: { name: /*name*/ ctx[0] } });

	tabs = new Tabs({
			props: {
				$$slots: { default: [create_default_slot] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			h1 = element("h1");
			h1.textContent = "Hello world!";
			t1 = space();
			create_component(form.$$.fragment);
			t2 = space();
			create_component(greeting.$$.fragment);
			t3 = space();
			create_component(tabs.$$.fragment);
			attr(h1, "class", "svelte-u9qvfs");
		},
		m(target, anchor) {
			insert(target, h1, anchor);
			insert(target, t1, anchor);
			mount_component(form, target, anchor);
			insert(target, t2, anchor);
			mount_component(greeting, target, anchor);
			insert(target, t3, anchor);
			mount_component(tabs, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const tabs_changes = {};

			if (dirty & /*$$scope*/ 2) {
				tabs_changes.$$scope = { dirty, ctx };
			}

			tabs.$set(tabs_changes);
		},
		i(local) {
			if (current) return;
			transition_in(form.$$.fragment, local);
			transition_in(greeting.$$.fragment, local);
			transition_in(tabs.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(form.$$.fragment, local);
			transition_out(greeting.$$.fragment, local);
			transition_out(tabs.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(h1);
			if (detaching) detach(t1);
			destroy_component(form, detaching);
			if (detaching) detach(t2);
			destroy_component(greeting, detaching);
			if (detaching) detach(t3);
			destroy_component(tabs, detaching);
		}
	};
}

function instance$6($$self) {
	const name = writable("Charles Brown");
	return [name];
}

class App extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-u9qvfs-style")) add_css$3();
		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});
	}
}

const target = document.getElementById("root");

const app = new App({ target });

export default app;
