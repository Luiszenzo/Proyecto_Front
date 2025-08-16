import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'find',
  standalone: true
})
export class FindPipe implements PipeTransform {
  transform(array: any[], property: string, value: any): any {
    if (!array || !property || value === undefined) {
      return null;
    }
    
    return array.find(item => item[property] === value);
  }
}