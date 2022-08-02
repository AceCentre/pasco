import templateSettings from 'lodash/templateSettings'
import template from 'lodash/template'

// Override the default settings for the underscore template function
// Uses {% instead of <% in templates
// These templates are using in the html with the type: 'text/x-template'
templateSettings.escape = /\{%-([\s\S]+?)%\}/g
templateSettings.evaluate = /\{%([\s\S]+?)%\}/g
templateSettings.interpolate = /\{%=([\s\S]+?)%\}/g
templateSettings.variable = "data"

export default template
