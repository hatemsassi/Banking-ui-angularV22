import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-main-admin-page',
    templateUrl: './main-admin-page.component.html',
    styleUrls: ['./main-admin-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class MainAdminPageComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
