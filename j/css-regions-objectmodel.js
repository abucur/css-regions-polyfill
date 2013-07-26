"use strict";

// 
// this class contains flow-relative data field
// 
cssRegions.Flow= function NamedFlow() {
    
    // elements poured into the flow
    this.content = this.lastContent = [];
    
    // elements that consume this flow
    this.regions = this.lastRegions = [];
    
    // this function is used to work with dom event streams
    var This=this; This.update = function(stream) {
        stream.schedule(This.update); This.relayout();
    }
}
    
cssRegions.Flow.prototype.removeFromContent = function(element) {
    
    // TODO: clean up stuff
    this.removeEventListeners(element);
    
    // remove reference
    var index = this.content.indexOf(element);
    if(index>=0) { this.content.splice(index,1); }
    
};

cssRegions.Flow.prototype.removeFromRegions = function(element) {
    
    // TODO: clean up stuff
    this.removeEventListeners(element);
    
    // remove reference
    var index = this.regions.indexOf(element);
    if(index>=0) { this.regions.splice(index,1); }
    
};

cssRegions.Flow.prototype.addToContent = function(element) {
    
    // walk the tree to find an element inside the content chain
    var content = this.content;
    var treeWalker = document.createTreeWalker(
        document.documentElement,
        NodeFilter.SHOW_ELEMENT,
        { 
            acceptNode: function(node) { 
                return content.indexOf(node) >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; 
            }
        },
        false
    ); 
    
    // which by the way has to be after the considered element
    treeWalker.currentNode = element;
    
    // if we find such node
    if(treeWalker.nextNode()) {
        
        // insert the element at his current location
        content.splice(content.indexOf(treeWalker.currentNode),0,element);
        
    } else {
        
        // add the new element to the end of the array
        content.push(element);
        
    }

};

cssRegions.Flow.prototype.addToRegions = function(element) {
    
    // walk the tree to find an element inside the region chain
    var regions = this.regions;
    var treeWalker = document.createTreeWalker(
        document.documentElement,
        NodeFilter.SHOW_ELEMENT,
        { 
            acceptNode: function(node) { 
                return regions.indexOf(node) >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; 
            } 
        },
        false
    );
    
    // which by the way has to be after the considered element
    treeWalker.currentNode = element;
    
    // if we find such node
    if(treeWalker.nextNode()) {
        
        // insert the element at his current location
        regions.splice(this.regions.indexOf(treeWalker.currentNode),0,element);
        
    } else {
        
        // add the new element to the end of the array
        regions.push(element);
    }
    
};

cssRegions.Flow.prototype.generateContentFragment = function() {
    var fragment = document.createDocumentFragment(); var This=this;

    // add copies of all due content
    for(var i=0; i<this.content.length; i++) {
        var element = this.content[i];
        
        // 
        // STEP 1: IDENTIFY FRAGMENT SOURCES AS SUCH
        //
        cssRegionsHelpers.markNodesAsFragmentSource([element], true);
        
        
        //
        // STEP 2: CLONE THE FRAGMENT SOURCES
        // 
        
        // depending on the requested behavior
        if(element.cssRegionsLastFlowIntoType=="element") {
            
            // add the element
            fragment.appendChild(element.cloneNode(true));
            
        } else {
            
            // add current children
            var el = element.firstChild; while(el) {
                fragment.appendChild(el.cloneNode(true));
                el = el.nextSibling;
            }
            
        }
        
        
        //
        // STEP 3: HIDE TEXT NODES IN FRAGMENT SOURCES
        //
        cssRegionsHelpers.hideTextNodesFromFragmentSource(this.content);
        
    }
    
    
    //
    // STEP 4: CONVERT CLONED FRAGMENT SOURCES INTO TRUE FRAGMENTS
    //
    cssRegionsHelpers.transformFragmentSourceToFragments(
        Array.prototype.slice.call(fragment.childNodes,0)
    )
    
    
    //
    // CLONED CONTENT IS READY!
    //
    return fragment;
}

cssRegions.Flow.prototype.relayout = function() {
    var This = this; 
    
    // batch relayout queries
    if(This.relayoutScheduled) { return; }
    This.relayoutScheduled = true;
    requestAnimationFrame(function(){
        
        //
        // note: it is recommended to look at the beautiful 
        // drawings I made before attempting to understand
        // this stuff. If you don't have them, ask me.
        //
        
        
        
        //
        // STEP 1: REMOVE PREVIOUS EVENT LISTENERS
        //
        
        // remove the listeners from everything
        This.removeEventListeners(This.lastRegions);
        This.removeEventListeners(This.lastContent);

        
        
        //
        // STEP 2: RESTORE CONTENT/REGIONS TO A CLEAN STATE
        //
        
        // cleanup previous layout
        cssRegionsHelpers.unmarkNodesAsRegion(This.lastRegions); This.lastRegions = This.regions.slice(0);
        cssRegionsHelpers.unmarkNodesAsFragmentSource(This.lastContent); This.lastContent = This.content.slice(0);
        
        
        
        //
        // STEP 3: EMPTY ALL REGIONS
        // ADD WRAPPER FOR FLOW CONTENT
        // PREPARE FOR CONTENT CLONING
        //
        
        // TODO: compute the style of all source elements
        // TODO: generate stylesheets for those rules
        
        // empty all the regions
        cssRegionsHelpers.markNodesAsRegion(This.regions);
        
        // create a fresh list of the regions
        var regionStack = This.regions.slice(0).reverse();
        
        
        
        //
        // STEP 4: CLONE THE CONTENT
        // ADD METADATA TO CLONED CONTENT
        // HIDE FLOW CONTENT AT INITIAL POSITION
        //
        
        // create a fresh list of the content
        var contentFragment = This.generateContentFragment();
        
        
        
        //
        // STEP 5: POUR CONTENT INTO THE REGIONS
        //
        
        // layout this stuff
        cssRegions.layoutContent(regionStack, contentFragment);
        
        
        
        //
        // STEP 6: REGISTER TO UPDATE EVENTS
        //
        
        // make sure regions update are taken in consideration
        This.addEventListeners(This.content);
        This.addEventListeners(This.regions);
        
        
        
        // mark layout has being done
        This.relayoutScheduled = false;
        
    });
    
}

cssRegions.Flow.prototype.addEventListeners = function(nodes) {
    var This=this; if(nodes instanceof Element) { nodes=[nodes] }
    
    nodes.forEach(function(element) {
        if(!element.cssRegionsEventStream) {
            element.cssRegionsEventStream = new myDOMUpdateEventStream({target: element});
            element.cssRegionsEventStream.schedule(This.update);
        }
    });
    
}

cssRegions.Flow.prototype.removeEventListeners = function(nodes) {
    var This=this; if(nodes instanceof Element) { nodes=[nodes] }
    
    nodes.forEach(function(element) {
        if(element.cssRegionsEventStream) {
            element.cssRegionsEventStream.dispose();
            delete element.cssRegionsEventStream;
        }
    });
    
}

// alias
cssRegions.NamedFlow = cssRegions.Flow;


//
// this class is a collection of named flows (not an array, sadly)
//
cssRegions.NamedFlowCollection = function NamedFlowCollection() {
    
    this.length = 0;
    
}