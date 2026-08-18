import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { HelperService } from '../../services/helper/helper.service';

@Component({
    selector: 'app-menu',
    templateUrl: './menu.component.html',
    styleUrls: ['./menu.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class MenuComponent implements OnInit {

  @Input() isAdmin = false;
  role = 'user';
  userFullname = '';

  constructor(
    private helperService: HelperService
  ) { }

  ngOnInit(): void {
    if (this.isAdmin) {
      this.role = 'admin';
    }
    this.userFullname = this.helperService.userFullname;
  }

}
