//# Theme Discs
//Rendered with [d3.js](http://d3js.org)

//**Usage:** Select _"view sorted"_  and adjust the _"Sorting Criteria"_ to sort the colors into
//clusters. Click _"Generate New"_ to create a new theme with a new random bright color added to the range.
//This demonstrates construction of `toxi.color.TColor` themes via textual descriptions of shades and Colors
//adding a random element to the theme.
define([
    'd3',
    'dat/gui/GUI',
    'toxi/geom/Vec3D',
    'toxi/util/datatypes/FloatRange',
    'toxi/color/TColor',
    'toxi/color/ColorTheme',
    'toxi/color/ColorRange',
    'toxi/color/accessCriteria',
    'toxi/internals/each',
    'toxi/internals/keys',
    'toxi/internals/mixin'
], function( d3, datGui, Vec3D, FloatRange, TColor, ColorTheme, ColorRange, AccessCriteria, each, keys, mixin ){

    var area = window.innerWidth * window.innerHeight;
    var defaults = {
        //build a ColorTheme with a ColorRange, NamedColor
        //and an arbitrary weight
        palette: {
            'soft ivory': 0.5,
            'intense goldenrod': 0.25,
            'warm saddlebrown': 0.15,
            'fresh teal': 0.05,
            'bright yellowgreen': 0.05
        },
        scaleRange: new FloatRange( area * 0.00001, area * 0.0001 ),
        padding: window.innerWidth / 20,
        num: 200,
        sort: false,
        primaryCriteria: "HUE",
        secondaryCriteria: "BRIGHTNESS"
    };

    function themeDiscs( options ){
        var app = {},
            container = d3.select('#example-container'),
            create,
            svg;

        mixin(app, options||{});

        svg = container
            .append('svg:svg')
            .attr('width', app.width)
            .attr('height', 0);
        svg
            .transition()
            .duration(1000)
            .attr('height',app.height);

        app.clusterSort =  function( numClusters ){
            numClusters = numClusters || 10;
            var slices = [],
                findInCluster,
                clusterLength,
                start,
                i;

            if( !app.list ){
                return;
            }

            findInCluster = function( color ){
                var indices;
                slices.forEach(function(slice, i){
                    slice.forEach(function(c, j){
                        if( c.equals(color) ) {
                            indices = [i,j];
                        }
                    });
                });
                return indices;
            };

            app.list.clusterSort(
                AccessCriteria[app.primaryCriteria],
                AccessCriteria[app.secondaryCriteria],
                numClusters
            );

            clusterLength = app.list.size() / numClusters;

            for( i=0; i<numClusters; i++){
                start = i*clusterLength;
                slices.push(app.list.colors.slice(start,start+clusterLength));
            }

            svg.selectAll('circle')
                .transition()
                .delay(function(d,i){ return i*10; })
                .duration(1000)
                .attr('cx', function(d){
                    //find color
                    var indices = findInCluster(d.color);
                    return ((app.width-(app.padding*2))/(numClusters-1)) * (indices[0] || 0) + app.padding;
                })
                .attr('cy', function(d){
                    var indices = findInCluster(d.color);
                    return ((app.height-(app.padding*2))/(slices[0].length-1)) * (indices[1] || 0) + app.padding;
                })
                .each('end', function(){
                    d3.select(this)
                        .transition()
                        .duration(1000)
                        .attr('r', 12);
                });
        };

        app.unSort = function(){
            console.log('unSort: ', svg.selectAll('circle') );
            svg.selectAll('circle')
                .transition()
                .delay(function(d,i){ return i * 10; })
                .duration(1000)
                .ease('elastic')
                .attr('r', function(d){ return d.vec3.z; })
                .attr('cx', function(d){ return d.vec3.x; })
                .attr('cy', function(d){ return d.vec3.y; });
        };

        app.reset =  function(){
            app.remove(function(){
                app.list = create(svg, app.num);
                app.updateSort();
            });
        };

        app.updateSort = function(){
            app[ app.sort ? 'clusterSort' : 'unSort' ]();
        };

        app.remove = function(callback){
            callback = callback || function(){};
            var count = 0,
                nodes = svg.selectAll('circle');

            if( !nodes[0].length ){
                callback();
                return;
            }
            return nodes
                .transition()
                .delay(function(d,i){ return i; })
                .duration(1000)
                .attr('r', 0)
                .remove()
                .each(function(){ ++count; })
                .each('end', function(){
                    if( !--count){
                        callback();
                    }
                });
        };

        create = function( svg, num ){
            var theme = new ColorTheme('discs');
            each( app.palette, function( weight, descriptor ){
                theme.addRange(descriptor, weight);
            });
            theme.addRange( ColorRange.BRIGHT, TColor.newRandom(), Math.random(0.02, 0.05) );
            var list = theme.getColors(num),
                nodes = list.colors.map(function(color){
                    return {
                        vec3: new Vec3D(Math.random()*app.width, Math.random()*app.height, app.scaleRange.pickRandom()),
                        color: color.setAlpha(Math.random())
                    };
                });

            d3.select('#example-container')
                .style('background-color', list.getAverage().toHexCSS());

            svg
                .selectAll('circle')
                .data(nodes)
                .enter()
                .append('svg:circle')
                .attr('r', function(d){ return 0.0; })
                .attr('cx', function(d){ return d.vec3.x; })
                .attr('cy', function(d){ return d.vec3.y; })
                .style('fill', function(d){ return d.color.toRGBACSS(); });

            return list;
        };

        app.list = create( svg, app.num );
        app.updateSort();
        return app;
    }

    //Build the [dat-gui](http://workshop.chromeexperiments.com/examples/gui/)
    //interface with the instance of the application
    function buildGui( app ){
        var gui = new datGui(),
            criterias = keys(AccessCriteria),
            sortingFolder;

        gui.add(app,'num',50,500).name('#');
        sortingFolder = gui.addFolder('Sorting Criteria');
        each([
            sortingFolder
                .add(app, 'primaryCriteria', criterias)
                .name('Primary'),
            sortingFolder
                .add(app, 'secondaryCriteria', criterias)
                .name('Secondary'),
            gui.add(app,'sort')
                .name('View sorted')
        ],function(controller){
            controller.onChange(app.updateSort);
        });
        gui.add(app, 'reset').name('Generate New Theme');
        sortingFolder.open();
        return gui;
    }

    //initialize the example, then build the gui
    return function startExample(){
        mixin(defaults, {
            width: window.innerWidth,
            height: window.innerHeight - 50
        });
        var app = themeDiscs( defaults );
        buildGui( app );
        return app;
    };
});
