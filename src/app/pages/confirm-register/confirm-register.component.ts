import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-confirm-register',
    templateUrl: './confirm-register.component.html',
    styleUrls: ['./confirm-register.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ConfirmRegisterComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
