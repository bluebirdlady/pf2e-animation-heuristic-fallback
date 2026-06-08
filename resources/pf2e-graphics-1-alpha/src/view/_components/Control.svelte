<script lang='ts'>
	export let title = 'Control Title';
	export let explain = 'Explainer';
</script>

<label class='grid grid-cols-3 items-center'>
	<slot name='title'>
		<span class='flex items-center' data-tooltip={explain}>
			{title}
			<i class='fa fa-info-circle px-2 ml-auto'></i>
		</span>
	</slot>
	<slot name='inputDiv'>
		<div class='flex align-middle items-center col-span-2'>
			<slot></slot>
		</div>
	</slot>
</label>
