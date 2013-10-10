/*-
 * Copyright (c)2013 Takehiko NOZAKI,
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS ``AS IS'' AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 * OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 *
 */

Ext.define('My.tree.TreeNode', {
  override: 'Ext.tree.TreeNode',
  inherit: {
    appendChild: Ext.tree.TreeNode.prototype.appendChild
  },
  appendChild: function(node) {
    this.inherit.appendChild.apply(this, arguments);
    if (this.ownerTree.cascading)
      node.attributes.checked = this.attributes.checked;
    return node;
  }
});

Ext.define('My.tree.TreeNodeUI', {
  override: 'Ext.tree.TreeNodeUI',
  inherit: {
    renderElements: Ext.tree.TreeNodeUI.prototype.renderElements,
    toggleCheck: Ext.tree.TreeNodeUI.prototype.toggleCheck
  },
  partial: false,
  buildCheckboxClass: function() {
    var classes = new Array();
    classes.push('tri-state-checkbox');
    if (Ext.isIE10p)
      classes.push('tri-state-checkbox-ie10');
    if (this.isChecked()) {
      if (this.partial)
        classes.push('tri-state-checkbox-partial');
      else
        classes.push('tri-state-checkbox-checked');
    }
    return classes.join(' ');
  },
  hasCheckedChildren: function() {
    var checked = false;
    this.node.eachChild(function(child) {
      var ui = child.getUI();
      if (ui.isChecked()) {
        checked = true;
        return;
      }
    });
    return checked;
  },
  hasPartialChildren: function() {
    var partial = false;
    this.node.eachChild(function(child) {
      var ui = child.getUI();
      if (!ui.isChecked() || ui.partial) {
        partial = true;
        return;
      }
    });
    return partial;
  },
  renderElements: function(n, a, targetNode, bulkRender) {
    this.inherit.renderElements.apply(this, arguments);
    if (this.node.ownerTree.cascading && this.checkbox) {
      var element = Ext.fly(this.checkbox);
      element.addClass('tri-state-checkbox-hidden');
      var dummy = new Ext.Element(Ext.DomHelper.createDom({
        tag: 'span'
      }));
      dummy.addClass(this.buildCheckboxClass());
      dummy.replace(element);
      dummy.appendChild(this.checkbox);
    }
  },
  toggleCheck: function(checked, partial) {
    this.inherit.toggleCheck.apply(this, arguments);
    if (this.node.ownerTree.cascading && this.checkbox) {
      this.partial = partial;
      this.checkbox.parentNode.className = this.buildCheckboxClass();
    }
  },
  toggleCheckCascade: function(checked) {
    this.node.cascade(function(child) {
      child.getUI().toggleCheck(checked, false);
    });
    if (this.node.parentNode) {
      this.node.parentNode.bubble(function(parent) {
        var ui = parent.getUI();
        ui.toggleCheck(
          ui.hasCheckedChildren(parent),
          ui.hasPartialChildren(parent)
        );
      });
    }
  }
});

Ext.define('My.tree.TreePanel', {
  override: 'Ext.tree.TreePanel',
  inherit: {
    initComponent: Ext.tree.TreePanel.prototype.initComponent,
    getChecked: Ext.tree.TreePanel.prototype.getChecked,
    setRootNode: Ext.tree.TreePanel.prototype.setRootNode
  },
  updating: false,
  onCheckUpdate: function(node, checked) {
    if (this.cascading) {
      if (this.updating)
        return;
      this.updating = true;
      node.getUI().toggleCheckCascade(checked);
      this.updating = false;
    }
    this.fireCheckUpdate();
  },
  initComponent: function() {
    this.inherit.initComponent.apply(this, arguments);
    this.addEvents(
      'checkupdate'
    );
    this.on('checkchange', this.onCheckUpdate);
  },
  getChecked: function(key, startNode) {
    if (!this.cascading)
      return this.inherit.getChecked.apply(this, arguments);
    startNode = startNode || this.root;
    var result = new Array();
    var fn = function(node) {
      var ui = node.getUI();
      if (ui.isChecked() && !ui.partial) {
        if (key) {
          if (key === 'id')
            result.push(node.id);
          else
            result.push(node.attributes[key]);
        } else {
          result.push(node);
        }
      } else {
        node.eachChild(fn);
      }
    };
    fn(startNode);
    return result;
  },
  fireCheckUpdate: function() {
    this.fireEvent('checkupdate', this);
  }
});

