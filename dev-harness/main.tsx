import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { PanelProps } from '@grafana/data';
import { TraefikFlowPanel } from '../src/Panel';
import { TraefikFlowOptions } from '../src/types';
import { mockSeries } from './mocks';
import './style.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container not found');
}

const App = () => {
  const [size, setSize] = useState({ width: 900, height: 520 });
  const controlsRef = useRef<HTMLDivElement | null>(null);

  const props = useMemo(() => {
    const options: TraefikFlowOptions = {
      routerLabel: 'router',
      serviceLabel: 'service',
      codeLabel: 'code',
    };

    const panelProps: PanelProps<TraefikFlowOptions> = {
      id: 1,
      data: {
        series: mockSeries,
        state: 'Done',
        timeRange: {
          from: new Date(Date.now() - 3600 * 1000),
          to: new Date(),
          raw: { from: 'now-1h', to: 'now' },
        },
      },
      timeRange: {
        from: new Date(Date.now() - 3600 * 1000),
        to: new Date(),
        raw: { from: 'now-1h', to: 'now' },
      },
      width: size.width,
      height: size.height,
      options,
      renderCounter: 0,
      transparent: false,
      timeZone: 'browser',
      fieldConfig: { defaults: {}, overrides: [] },
      onOptionsChange: () => {},
      onFieldConfigChange: () => {},
      replaceVariables: (value: string) => value,
      eventBus: undefined as any,
    };

    return panelProps;
  }, [size]);

  useLayoutEffect(() => {
    const updateSize = () => {
      const controlsHeight = controlsRef.current?.getBoundingClientRect().height ?? 0;
      const width = Math.max(320, window.innerWidth - 48);
      const height = Math.max(240, window.innerHeight - controlsHeight - 48);
      setSize({ width, height });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div className="harness">
      <div className="controls" ref={controlsRef}>
        <label>Auto-fit</label>
        <span>{Math.round(size.width)} x {Math.round(size.height)}</span>
      </div>
      <div className="canvas">
        <div
          style={{
            width: size.width,
            height: size.height,
            margin: '24px auto',
            background: '#181b1f',
            border: '1px solid rgba(204, 204, 220, 0.12)',
          }}
        >
          <TraefikFlowPanel {...props} />
        </div>
      </div>
    </div>
  );
};

ReactDOM.render(<App />, container);
