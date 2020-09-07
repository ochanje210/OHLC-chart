import React, { useEffect, useRef } from 'react';
import { ChartingLibraryWidgetOptions, widget, IChartingLibraryWidget } from 'shared/chartingLibrary/charting_library.min';
import { datafeed } from 'shared/chartingLibraryUtils/datafeed';
import styles from '../styles/Home.module.css';

const tvChartContainerId = 'tv_chart_container'

export default function Chart() {
  const tvWidget = useRef<IChartingLibraryWidget>()

  useEffect(() => {
    const widgetOptions: ChartingLibraryWidgetOptions = {
      symbol: 'BFX/BTC',
      container_id: tvChartContainerId,
      datafeed,
      interval: '1',
      locale: 'ko',
      timezone: 'Asia/Seoul'
    }

    tvWidget.current = new widget(widgetOptions)

    tvWidget.current.onChartReady(() => {
			tvWidget.current.headerReady().then(() => {
				const button = tvWidget.current.createButton();
				button.setAttribute('title', 'Click to show a notification popup');
				button.classList.add('apply-common-tooltip');
				button.addEventListener('click', () => tvWidget.current.showNoticeDialog({
						title: 'Notification',
						body: 'TradingView Charting Library API works correctly',
						callback: () => {
							console.log('Noticed!');
						},
					}));
				button.innerHTML = 'Check API';
			});
		});

    return () => {
      if (tvWidget.current) {
        tvWidget.current.remove();
        tvWidget.current = null;
      }
    }
  }, [])

  return (
    <div className={styles.container}>
      <div id={tvChartContainerId}>
        
      </div>
    </div>
  )
}
