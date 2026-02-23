import { PanelPlugin } from '@grafana/data';
import { TraefikFlowPanel } from 'components/Panel';
import { TraefikFlowOptions } from './types';

export const plugin = new PanelPlugin<TraefikFlowOptions>(TraefikFlowPanel).setPanelOptions((builder) => {
  return builder
    .addTextInput({
      path: 'routerLabel',
      name: 'Router label',
      defaultValue: 'router',
    })
    .addTextInput({
      path: 'serviceLabel',
      name: 'Service label',
      defaultValue: 'service',
    })
    .addTextInput({
      path: 'codeLabel',
      name: 'Code label',
      defaultValue: 'code',
    })
    .addSelect({
      path: 'palette',
      name: 'Ribbon palette',
      settings: {
        options: [
          { value: 'theme', label: 'Grafana theme' },
          { value: 'hue:blue', label: 'Hue: Blue' },
          { value: 'hue:green', label: 'Hue: Green' },
          { value: 'hue:orange', label: 'Hue: Orange' },
          { value: 'hue:red', label: 'Hue: Red' },
          { value: 'hue:purple', label: 'Hue: Purple' },
          { value: 'hue:cyan', label: 'Hue: Cyan' },
          { value: 'hue:gray', label: 'Hue: Gray' },
        ],
      },
      defaultValue: 'theme',
    })
    .addBooleanSwitch({
      path: 'hideZeroNodes',
      name: 'Hide zero routes/services',
      defaultValue: false,
    });
});
