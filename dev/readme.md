This file has small code snippets for faster development.  

**overview.html**  

```html
<script>
// mimic the click on dialog warning
var i = 0;
let t = setInterval(function() {
	var d = document.getElementById('dialog-end');
	if (d) {
		d.click();
		
		var bss = document.getElementById('button-section-ecosystem');
		bss.click();
		
		clearInterval(t);
	}
	i++;
	if (i > 100) clearInterval(t);
}, 500);
</script>
```

**welcome.html**  

```html
<script>
// mimic the wallet opening
setTimeout(function() {
	var a = document.getElementById('button-welcome-openwallet');
	a.click();
	var b = document.getElementById('input-load-password');
	b.value = 'steve1mainnet';
	var c = document.getElementById('button-load-load');
	c.click();
}, 200);
</script>
```