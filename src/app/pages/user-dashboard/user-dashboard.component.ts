import { AfterViewInit, Component, ElementRef, OnInit, ChangeDetectionStrategy, ViewChild } from '@angular/core';
import { LightInfoInput } from '../../components/light-info/light-info.component';
import { StatisticsService } from '../../services/services/statistics.service';
import { HelperService } from '../../services/helper/helper.service';
import { lastValueFrom } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import { DatePipe } from '@angular/common';

Chart.register(...registerables);

@Component({
    selector: 'app-user-dashboard',
    templateUrl: './user-dashboard.component.html',
    styleUrls: ['./user-dashboard.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class UserDashboardComponent implements OnInit, AfterViewInit {

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  accountInfoList: Array<LightInfoInput> = [];
  private accountBalance = 0;
  private highestTransfer = 0;
  private highestDeposit = 0;
  private chart: Chart<'line'> | undefined;
  startDate: string = new Date().toISOString().substring(0, 10);
  endDate: string = new Date().toISOString().substring(0, 10);


  constructor(
    private statisticsService: StatisticsService,
    private helperService: HelperService,
    private datePipe: DatePipe
  ) {
  }

  ngOnInit(): void {
    this.initializeAccountInfo();
  }

  ngAfterViewInit(): void {
    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Sum transactions by day',
          data: []
        }]
      },
      options: {
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true
            }
          },
          title: {
            display: true,
            text: 'My awesome chart'
          }
        }
      }
    });
  }

  filterStatistics() {
    this.statisticsService.findSumTractionsByDate({
      'user-id': this.helperService.userId,
      'start-date': this.datePipe.transform(this.startDate, 'yyyy-MM-dd') as string,
      'end-date': this.datePipe.transform(this.endDate, 'yyyy-MM-dd') as string
    }).subscribe({
      next: (values) => {
        const labels: Array<string> = [];
        const dataValues: Array<number> = [];
        for(let record of values) {
          labels.push(record.transactionDate as string);
          dataValues.push(record.amount as number);
        }
        if (this.chart) {
          this.chart.data.labels = labels;
          this.chart.data.datasets[0].data = dataValues;
          this.chart.update();
        }
      }
    });
  }

  private async initializeAccountInfo() {
    this.accountBalance = await lastValueFrom(
      this.statisticsService.getAccountBalance({'user-id': this.helperService.userId})
    );
    this.highestTransfer = await lastValueFrom(
      this.statisticsService.highestTransfer({
        'user-id': this.helperService.userId
      })
    );
    this.highestDeposit = await lastValueFrom(
      this.statisticsService.highestDeposit({
        'user-id': this.helperService.userId
      })
    );
    this.accountInfoList = [
      {
        title: 'Account balance',
        amount: this.accountBalance,
        infoStyle: 'bg-primary'
      },
      {
        title: 'Highest transfer',
        amount: this.highestTransfer,
        infoStyle: 'bg-warning'
      },
      {
        title: 'Highest deposit',
        amount: this.highestDeposit,
        infoStyle: 'bg-success'
      }
    ];
  }

}
