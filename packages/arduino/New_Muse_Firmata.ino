#include <Adafruit_NeoPixel.h>
#include "serialParser.h"
#include "timeOut.h"

#define DIGI_READ 1
#define ANA_READ 2
#define DIGI_WRITE 4
#define PWM_WRITE 8
#define DIGI_WATCH 16
#define ANA_REPORT 32
#define LIGHT_STRIP 64
#define READY 127

////////// Light strip defines:
#define BEGIN 1
#define SHOW 2
#define SET_COLOR 3


serialParser parser(Serial);
Adafruit_NeoPixel * strip = 0;

class analogPin {
public:
  int pin;
  int interval;
  long timer;
  bool reporting;
  analogPin(){
    
  }
  analogPin(int p){
    pin=p;
    timer=0;
    interval=1000;
    reporting=false;
  }
  void setInterval(int i){
    interval=i;
    reporting=true;
  }
  void clearInterval(){
    reporting=false;
  }
  void idle(){
    if(timer<millis()&&reporting){
      timer=millis()+interval;
      int val = analogRead(pin);
      parser.sendPacket(REPORT,ANA_READ,pin, (val >> 7) & 127, val & 127);
    }
  }
};

class digitalPin {
public:
  int pin;
  bool watching;
  int lastState;
  digitalPin(){
    watching = lastState = false;
  }
  digitalPin(int p){
    pin=p;
    watching=false;
  }
  void startWatch(){
    watching =true;
    pinMode(pin,INPUT_PULLUP);
  }
  void stopWatch(){
    watching = true;
  }
  void idle(){
    if(watching && digitalRead(pin) != lastState){
      lastState = !lastState;
      parser.sendPacket(REPORT,DIGI_READ,pin, lastState);
    }
  }
};

analogPin * aPins[6];
digitalPin * dPins[20];

/*char oldPINB =B00000000;
char oldPIND =B00000000;
char oldPINC =B00000000;
char watched[20]={0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0};

void watchPort(char &oldP,char newP,int aug){
  char xorP = oldP^newP;
  if(xorP){
    for(int i=0; i<8; i++){
      if(bitRead(xorP,i)&&watched[i+aug]){
        parser.sendPacket(REPORT,DIGI_READ, i+aug, bitRead(newP,i));
      }
    }
    oldP=newP;
  }
}

void watchInputs(){
  char newPINB = (PINB & (B11111111^DDRB) & B00111111);
  char newPIND = (PIND & (B11111111^DDRD) & B11111100);
  
  char newPINC = (PINC & (B11111111^DDRC) & B00111111);
  
  watchPort(oldPINB,newPINB,8);
  watchPort(oldPIND,newPIND,0);
  watchPort(oldPINC,newPINC,14);
}

void setWatch(int pin){
  pinMode(pin,INPUT_PULLUP);
  watched[pin]=1;
}*/


void setup() {
  Serial.begin(115200);

  for(int i=0; i<6; i++){
    aPins[i] = new analogPin(i);
  } 

  for(int i=0; i<20; i++){
    dPins[i] = new digitalPin(i);
  } 
  
  parser.address = 1;

  parser.on(READY, [](unsigned char * input, int size){
    parser.sendPacket(REPORT,READY);
  });

  parser.on(DIGI_READ, [](unsigned char * input, int size){
    pinMode(input[2],INPUT_PULLUP);
    parser.sendPacket(REPORT,DIGI_READ, input[2], digitalRead(input[2]));
  });

  parser.on(ANA_READ, [](unsigned char * input, int size){
    parser.sendPacket(REPORT,ANA_READ, input[2], analogRead(input[2]));
  });

  parser.on(DIGI_WRITE, [](unsigned char * input, int size){
    pinMode(input[2],OUTPUT);
    digitalWrite(input[2], input[3]);
  });

  parser.on(PWM_WRITE, [](unsigned char * input, int size){
    pinMode(input[2],OUTPUT);
    analogWrite(input[2], (input[3]<<7) + input[4]);
  });

  parser.on(ANA_REPORT, [](unsigned char * input, int size){
    if((input[3]<<7) + input[4]) aPins[input[2]]->setInterval((input[3]<<7) + input[4]);
    else if((input[3]<<7) + input[4]==0) aPins[input[2]]->clearInterval();
  });

  parser.on(LIGHT_STRIP, [](unsigned char * input, int size){
    switch(input[2]){
      case BEGIN:
        if(strip) delete strip;
        strip = new Adafruit_NeoPixel(input[4], input[3], NEO_GRB + NEO_KHZ800);
        strip->begin();
        break;
      case SHOW:
        if(strip){
          strip->show();
        } else {
          parser.startMessage();
          Serial.println("Error: LED strip not initialized");
          parser.endMessage();
        }
        break;
      case SET_COLOR:
        if(strip){
          strip->setPixelColor(input[3], input[4] * 2, input[5] * 2, input[6] * 2);
        } else {
          parser.startMessage();
          Serial.println("Error: LED strip not initialized");
          parser.endMessage();
        }
        break;
    }
  });

  parser.on(DIGI_WATCH, [](unsigned char * input, int size){
    if(input[3]) dPins[input[2]]->startWatch();
    else if(input[3]==0) dPins[input[2]]->stopWatch();
  });

  parser.sendPacket(REPORT,READY);
}

void loop() {
  parser.idle();
  for(int i=0; i<6; i++){
    aPins[i]->idle();
  } 
  for(int i=0; i<20; i++){
    dPins[i]->idle();
  } 
}
