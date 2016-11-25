## All-in-One Compiler for Angular 2
Package contains one combined Angular 2 compiler that provides:
 - Typescript compilation 
 - Assets compilation (HTML, styles)
 - Angular 2's AoT compilation
 - Rollup's bundling with tree-shaking
 
## Compiler modes

### Default mode
By default, this compiler compiles ts-files and component assets (HTML, LESS, and SASS) of
an Angular 2 app into CommonJS modules, which then are passed to Meteor to load.
In this case, the app is bootstrapped using regular dynamic bootstrapping:

In this case, Angular 2 uses just-in-time template compiler to parse component
templates before the app is loaded.

## AoT mode
If the app is launched with the `AOT` env variable preset, i.e, `AOT=1 meteor`,
the compiler's AoT mode comes into play. Compiler uses internally
Angular 2's CLI metadata compiler and Angular 2's template compilers in order to
pre-compile component assets, first, into ES6 ts-modules, and then TypeScript compiler to
compile ts-modules to regular ES6 js-modules. As a result,
each file with `@Component, `@Directive`, or `@NgModule` annotations will
correspond internally to an ES6 js-module with the Angular 2 module factory
(it usually has `.ngfactory` extension if processed with `ngc` directly).

On the final step all generated factory and component ES6 js-modules
are bundled together using Rollup bundler in the tree-shaking mode.
Three-shaking is a special algorithm that traverses js-modules
(mostly of NPMs but not only) to find modules that are imported but
not unused (to be exact, exports of which are not used).
Then, they are excluded from the bundle.

As you can see above, this mode introduces more advanced and time assuming processing.
That's why makes sense to use it for the production.

### Bootstrapping
Result main Angular 2 module factory should be bootstrapped
using the code as follows:

Though, this compiler takes care of you on this stage as well:
you'll need only to add dynamic bootstrapping (as above), it then will find most top
Angular 2 module of your app and add bootstrapping code for you.

### Advantages over the default
Main advantages of the additional processing:
 - Components are loaded faster, hence app itself;
 - Angular 2 template compiler is not needed on the client side,
   hence the final js-bundle is smaller;
 - Compiled code is considered more secure;
 - You have chance to verify that templates are free of bugs,
   which is not fully available with the dynamic compilation;
 - Tree-shaking reduces size of the final bundle.

For more info on the pluses and other details, please, read here.

### Demo

TODO demo comes out as 1.4MB (not compressed) js-bundle in the default mode,
at the same time it's of 1.1MB size in the AoT mode, which is 0.3MB less.
It should be taken into account that for big apps difference can be even
more substantial since more NPMs you use - more chance the number of unused
exports increases making the tree-shaking to unleash its power.
You can notice as well that the app runs a bit faster, thanks to the pre-compiled assets.
