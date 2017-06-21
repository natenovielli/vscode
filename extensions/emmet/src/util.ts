/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import parse from '@emmetio/html-matcher';
import Node from '@emmetio/node';
import { DocumentStreamReader } from './bufferStream';
import * as path from 'path';
import * as fs from 'fs';

let variablesFromFile = {};
let profilesFromFile = {};
let emmetExtensionsPath = '';

export const LANGUAGE_MODES: Object = {
	'html': ['!', '.', '}'],
	'jade': ['!', '.', '}'],
	'slim': ['!', '.', '}'],
	'haml': ['!', '.', '}'],
	'xml': ['.', '}'],
	'xsl': ['.', '}'],
	'javascriptreact': ['.'],
	'typescriptreact': ['.'],
	'css': [':'],
	'scss': [':'],
	'sass': [':'],
	'less': [':'],
	'stylus': [':']
};

// Explicitly map languages to their parent language to get emmet support
export const MAPPED_MODES: Object = {
	'handlebars': 'html'
};
export function validate(allowStylesheet: boolean = true): boolean {
	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showInformationMessage('No editor is active');
		return false;
	}
	if (!allowStylesheet && isStyleSheet(editor.document.languageId)) {
		return false;
	}
	return true;
}

export function getSyntax(document: vscode.TextDocument): string {
	if (document.languageId === 'jade') {
		return 'pug';
	}
	if (document.languageId === 'javascriptreact' || document.languageId === 'typescriptreact') {
		return 'jsx';
	}
	return document.languageId;
}

export function isStyleSheet(syntax): boolean {
	let stylesheetSyntaxes = ['css', 'scss', 'sass', 'less', 'stylus'];
	return (stylesheetSyntaxes.indexOf(syntax) > -1);
}

export function getProfile(syntax: string): any {
	let profilesFromSettings = vscode.workspace.getConfiguration('emmet')['syntaxProfiles'] || {};
	let profilesConfig = Object.assign({}, profilesFromFile, profilesFromSettings);

	let options = profilesConfig[syntax];
	if (!options || typeof options === 'string') {
		if (options === 'xhtml') {
			return {
				selfClosingStyle: 'xhtml'
			};
		}
		return {};
	}
	let newOptions = {};
	for (let key in options) {
		switch (key) {
			case 'tag_case':
				newOptions['tagCase'] = (options[key] === 'lower' || options[key] === 'upper') ? options[key] : '';
				break;
			case 'attr_case':
				newOptions['attributeCase'] = (options[key] === 'lower' || options[key] === 'upper') ? options[key] : '';
				break;
			case 'attr_quotes':
				newOptions['attributeQuotes'] = options[key];
				break;
			case 'tag_nl':
				newOptions['format'] = (options[key] === 'true' || options[key] === 'false') ? options[key] : 'true';
				break;
			case 'indent':
				newOptions['attrCase'] = (options[key] === 'true' || options[key] === 'false') ? '\t' : options[key];
				break;
			case 'inline_break':
				newOptions['inlineBreak'] = options[key];
				break;
			case 'self_closing_tag':
				if (options[key] === true) {
					newOptions['selfClosingStyle'] = 'xml'; break;
				}
				if (options[key] === false) {
					newOptions['selfClosingStyle'] = 'html'; break;
				}
				newOptions['selfClosingStyle'] = options[key];
				break;
			default:
				newOptions[key] = options[key];
				break;
		}
	}
	return newOptions;
}

export function getVariables(): any {
	let variablesFromSettings = vscode.workspace.getConfiguration('emmet')['variables'];
	return Object.assign({}, variablesFromFile, variablesFromSettings);
}

export function getMappedModes(): any {
	let finalMappedModes = {};
	let syntaxProfileConfig = vscode.workspace.getConfiguration('emmet')['syntaxProfiles'];
	let syntaxProfiles = Object.assign({}, MAPPED_MODES, syntaxProfileConfig ? syntaxProfileConfig : {});
	Object.keys(syntaxProfiles).forEach(syntax => {
		if (typeof syntaxProfiles[syntax] === 'string' && LANGUAGE_MODES[syntaxProfiles[syntax]]) {
			finalMappedModes[syntax] = syntaxProfiles[syntax];
		}
	});
	return finalMappedModes;
}

export function updateExtensionsPath() {
	let currentEmmetExtensionsPath = vscode.workspace.getConfiguration('emmet')['extensionsPath'];
	if (emmetExtensionsPath !== currentEmmetExtensionsPath) {
		emmetExtensionsPath = currentEmmetExtensionsPath;

		if (emmetExtensionsPath && emmetExtensionsPath.trim()) {
			let dirPath = path.isAbsolute(emmetExtensionsPath) ? emmetExtensionsPath : path.join(vscode.workspace.rootPath, emmetExtensionsPath);
			let snippetsPath = path.join(dirPath, 'snippets.json');
			let profilesPath = path.join(dirPath, 'syntaxProfiles.json');
			if (dirExists(dirPath)) {
				fs.readFile(snippetsPath, (err, snippetsData) => {
					if (err) {
						return;
					}
					try {
						let snippetsJson = JSON.parse(snippetsData.toString());
						variablesFromFile = snippetsJson['variables'];
					} catch (e) {

					}
				});
				fs.readFile(profilesPath, (err, profilesData) => {
					if (err) {
						return;
					}
					try {
						profilesFromFile = JSON.parse(profilesData.toString());
					} catch (e) {

					}
				});
			}
		}
	}
}
export function getOpenCloseRange(document: vscode.TextDocument, position: vscode.Position): [vscode.Range, vscode.Range] {
	let rootNode: Node = parse(new DocumentStreamReader(document));
	let nodeToUpdate = getNode(rootNode, position);
	let openRange = new vscode.Range(nodeToUpdate.open.start, nodeToUpdate.open.end);
	let closeRange = null;
	if (nodeToUpdate.close) {
		closeRange = new vscode.Range(nodeToUpdate.close.start, nodeToUpdate.close.end);
	}
	return [openRange, closeRange];
}

export function getNode(root: Node, position: vscode.Position, includeNodeBoundary: boolean = false) {
	let currentNode: Node = root.firstChild;
	let foundNode: Node = null;

	while (currentNode) {
		const nodeStart: vscode.Position = currentNode.start;
		const nodeEnd: vscode.Position = currentNode.end;
		if ((nodeStart.isBefore(position) && nodeEnd.isAfter(position))
			|| (includeNodeBoundary && (nodeStart.isBeforeOrEqual(position) && nodeEnd.isAfterOrEqual(position)))) {

			foundNode = currentNode;
			// Dig deeper
			currentNode = currentNode.firstChild;
		} else {
			currentNode = currentNode.nextSibling;
		}
	}

	return foundNode;
}

export function getInnerRange(currentNode: Node): vscode.Range {
	if (!currentNode.close) {
		return;
	}
	return new vscode.Range(currentNode.open.end, currentNode.close.start);
}

export function getDeepestNode(node: Node): Node {
	if (!node || !node.children || node.children.length === 0) {
		return node;
	}
	for (let i = node.children.length - 1; i >= 0; i--) {
		if (node.children[i].type !== 'comment') {
			return getDeepestNode(node.children[i]);
		}
	}
}

export function findNextWord(propertyValue: string, pos: number): [number, number] {

	let foundSpace = pos === -1;
	let foundStart = false;
	let foundEnd = false;

	let newSelectionStart;
	let newSelectionEnd;
	while (pos < propertyValue.length - 1) {
		pos++;
		if (!foundSpace) {
			if (propertyValue[pos] === ' ') {
				foundSpace = true;
			}
			continue;
		}
		if (foundSpace && !foundStart && propertyValue[pos] === ' ') {
			continue;
		}
		if (!foundStart) {
			newSelectionStart = pos;
			foundStart = true;
			continue;
		}
		if (propertyValue[pos] === ' ') {
			newSelectionEnd = pos;
			foundEnd = true;
			break;
		}
	}

	if (foundStart && !foundEnd) {
		newSelectionEnd = propertyValue.length;
	}

	return [newSelectionStart, newSelectionEnd];
}

export function findPrevWord(propertyValue: string, pos: number): [number, number] {

	let foundSpace = pos === propertyValue.length;
	let foundStart = false;
	let foundEnd = false;

	let newSelectionStart;
	let newSelectionEnd;
	while (pos > -1) {
		pos--;
		if (!foundSpace) {
			if (propertyValue[pos] === ' ') {
				foundSpace = true;
			}
			continue;
		}
		if (foundSpace && !foundEnd && propertyValue[pos] === ' ') {
			continue;
		}
		if (!foundEnd) {
			newSelectionEnd = pos + 1;
			foundEnd = true;
			continue;
		}
		if (propertyValue[pos] === ' ') {
			newSelectionStart = pos + 1;
			foundStart = true;
			break;
		}
	}

	if (foundEnd && !foundStart) {
		newSelectionStart = 0;
	}

	return [newSelectionStart, newSelectionEnd];
}

export function getNodesInBetween(node1: Node, node2: Node): Node[] {
	// Same node
	if (sameNodes(node1, node2)) {
		return [node1];
	}

	// Same parent
	if (sameNodes(node1.parent, node2.parent)) {
		return getNextSiblingsTillPosition(node1, node2.end);
	}

	// node2 is ancestor of node1
	if (node2.start.isBefore(node1.start)) {
		return [node2];
	}

	// node1 is ancestor of node2
	if (node2.start.isBefore(node1.end)) {
		return [node1];
	}

	// Get the highest ancestor of node1 that should be commented
	while (node1.parent && node1.parent.end.isBefore(node2.start)) {
		node1 = node1.parent;
	}

	// Get the highest ancestor of node2 that should be commented
	while (node2.parent && node2.parent.start.isAfter(node1.start)) {
		node2 = node2.parent;
	}

	return getNextSiblingsTillPosition(node1, node2.end);
}

function getNextSiblingsTillPosition(node: Node, position: vscode.Position): Node[] {
	let siblings: Node[] = [];
	let currentNode = node;
	while (currentNode && position.isAfter(currentNode.start)) {
		siblings.push(currentNode);
		currentNode = currentNode.nextSibling;
	}
	return siblings;
}

export function sameNodes(node1: Node, node2: Node): boolean {
	if (!node1 || !node2) {
		return false;
	}
	return (<vscode.Position>node1.start).isEqual(node2.start) && (<vscode.Position>node1.end).isEqual(node2.end);
}

function dirExists(dirPath: string): boolean {
	try {

		return fs.statSync(dirPath).isDirectory();
	} catch (e) {
		return false;
	}
}
